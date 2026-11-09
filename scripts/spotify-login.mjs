// One-time login: run `npm run spotify:login`, approve in the browser, and the refresh token is saved to .env.
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';

try {
  process.loadEnvFile('.env');
} catch {
  // Values can also come from the environment; the check below reports anything missing.
}

const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret } = process.env;
if (!clientId || !clientSecret) {
  console.error('Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to the .env file first.');
  process.exit(1);
}

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const state = randomBytes(16).toString('hex');

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end();
    return;
  }
  const finish = (status, message) => {
    res.writeHead(status, { 'Content-Type': 'text/plain' }).end(message);
    console.log(message);
    if (status === 200) {
      server.close();
      server.closeAllConnections();
    }
  };

  // The state check stops another page from feeding this script a code that isn't yours.
  if (url.searchParams.get('state') !== state) return finish(400, 'State did not match. Run the login again.');
  const code = url.searchParams.get('code');
  if (!code) return finish(400, `Spotify did not approve the login: ${url.searchParams.get('error')}`);

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
  });
  const body = await response.json();
  if (!response.ok) return finish(400, `Spotify refused the login: ${body.error_description || body.error}`);

  const env = readFileSync('.env', 'utf8').replace(/^SPOTIFY_REFRESH_TOKEN=.*\r?\n?/m, '').trimEnd();
  writeFileSync('.env', `${env}\nSPOTIFY_REFRESH_TOKEN=${body.refresh_token}\n`);
  return finish(200, 'Done. The refresh token is saved in .env, and you can close this tab.');
});

server.listen(PORT, '127.0.0.1', () => {
  const authorize = new URL('https://accounts.spotify.com/authorize');
  authorize.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'user-read-currently-playing user-read-recently-played',
    state,
  });
  console.log(`Open this link and approve:\n\n${authorize}\n`);
});
