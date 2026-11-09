import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarize, summarizeRecent } from '../api/now-playing.js';

const track = {
  is_playing: true,
  currently_playing_type: 'track',
  progress_ms: 1000,
  item: {
    name: 'Song',
    duration_ms: 2000,
    artists: [{ name: 'A' }, { name: 'B' }],
    album: { images: [{ url: 'big.jpg' }] },
    external_urls: { spotify: 'https://open.spotify.com/track/1' },
    uri: 'spotify:track:1',
  },
};

test('a playing track returns only the fields the site shows', () => {
  assert.deepEqual(summarize(track), {
    isPlaying: true,
    title: 'Song',
    artist: 'A, B',
    image: 'big.jpg',
    url: 'https://open.spotify.com/track/1',
    uri: 'spotify:track:1',
    progressMs: 1000,
    durationMs: 2000,
  });
});

test('nothing playing, paused, podcasts and ads all count as not playing', () => {
  for (const body of [
    null,
    { ...track, is_playing: false },
    { ...track, currently_playing_type: 'episode' },
    { ...track, currently_playing_type: 'ad', item: null },
  ]) {
    assert.deepEqual(summarize(body), { isPlaying: false });
  }
});

test('the last played track is returned as not playing, with its song details', () => {
  const { progressMs, durationMs, ...song } = summarize(track);
  assert.deepEqual(summarizeRecent({ items: [{ track: track.item }] }), { ...song, isPlaying: false });
  assert.deepEqual(summarizeRecent({ items: [] }), { isPlaying: false });
});
