// Vercel serverless function: holds the Spotify keys and returns only the song details to the browser.
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENT_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

let cachedToken = { value: null, expiresAt: 0 };

async function getAccessToken() {
  if (Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: SPOTIFY_REFRESH_TOKEN }),
  });
  if (!response.ok) throw new Error(`Spotify token request failed: ${response.status}`);
  const { access_token: value, expires_in: expiresIn } = await response.json();
  // Renew a minute early so a token can't expire mid-request.
  cachedToken = { value, expiresAt: Date.now() + (expiresIn - 60) * 1000 };
  return value;
}

const songFields = (item) => ({
  title: item.name,
  artist: item.artists.map((artist) => artist.name).join(', '),
  image: item.album.images[0]?.url,
  url: item.external_urls.spotify,
  uri: item.uri,
});

/** Reduces Spotify's response to the fields the site shows. Podcasts, ads and paused playback count as not playing. */
export function summarize(body) {
  const item = body?.item;
  if (!body?.is_playing || body.currently_playing_type !== 'track' || !item) return { isPlaying: false };
  return { isPlaying: true, ...songFields(item), progressMs: body.progress_ms ?? 0, durationMs: item.duration_ms };
}

/** The most recently played track, shown when nothing is playing. */
export function summarizeRecent(body) {
  const item = body?.items?.[0]?.track;
  return item ? { isPlaying: false, ...songFields(item) } : { isPlaying: false };
}

async function getRecent(token) {
  const response = await fetch(RECENT_URL, { headers: { Authorization: `Bearer ${token}` } });
  // A login from before the recently-played permission was added gets 403; carry on without a last song.
  return response.ok ? summarizeRecent(await response.json()) : { isPlaying: false };
}

export async function GET() {
  try {
    const token = await getAccessToken();
    const response = await fetch(NOW_PLAYING_URL, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status !== 200 && response.status !== 204) throw new Error(`Spotify returned ${response.status}`);
    const now = summarize(response.status === 204 ? null : await response.json());
    return Response.json(now.isPlaying ? now : await getRecent(token), {
      // The CDN answers repeat visitors, so traffic to the site doesn't become traffic to Spotify.
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=15' },
    });
  } catch (error) {
    console.error(error.message);
    return Response.json({ isPlaying: false }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
