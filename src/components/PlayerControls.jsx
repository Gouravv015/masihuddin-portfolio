import { useEffect, useRef, useState } from 'react';

const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

let embedApi;
// Spotify's official embed is the only way a website may play Spotify audio; load its script once, on first use.
export const loadEmbedApi = () =>
  (embedApi ??= new Promise((resolve) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    script.onerror = () => {
      embedApi = null; // Let a later card retry instead of staying broken.
      resolve(null);
    };
    document.body.appendChild(script);
  }));

/**
 * Controls for the song you're playing on Spotify. Play drives a hidden Spotify embed: visitors logged in to
 * Spotify hear the full song, everyone else Spotify's preview clip. It plays from the start, not in sync with you.
 */
export function LiveControls({ song }) {
  const hostRef = useRef(null);
  const controllerRef = useRef(null);
  const [playback, setPlayback] = useState({ paused: true, position: 0, duration: 0 });
  const [ready, setReady] = useState(false);
  const playWhenReady = useRef(false);
  const [pending, setPending] = useState(false); // Clicked play before the embed finished loading.

  useEffect(() => {
    let cancelled = false;
    loadEmbedApi().then((api) => {
      if (!api || cancelled) return;
      const target = document.createElement('div');
      hostRef.current.appendChild(target);
      api.createController(target, { uri: song.uri, width: 300, height: 80 }, (controller) => {
        if (cancelled) return controller.destroy();
        controllerRef.current = controller;
        controller.addListener('ready', () => {
          setReady(true);
          // A click while the embed was still loading plays the song now.
          if (playWhenReady.current) controller.play();
        });
        controller.addListener('playback_update', ({ data }) => {
          if (!data.isPaused) setPending(false);
          setPlayback({ paused: data.isPaused, position: data.position, duration: data.duration });
        });
      });
    });
    return () => {
      cancelled = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
    // The embed is created once; song changes go through loadEntity below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controllerRef.current?.loadEntity(song.uri);
    setPlayback({ paused: true, position: 0, duration: 0 });
  }, [song.uri]);

  const progress = playback.duration ? (playback.position / playback.duration) * 100 : 0;

  return (
    <div className="player-controls">
      {/* Off-screen rather than display: none, which can stop the embed from loading. */}
      <div className="player-controls__embed" ref={hostRef} aria-hidden="true" />
      <div className="player-controls__row">
        <button
          type="button"
          onClick={() => {
            if (ready) controllerRef.current.togglePlay();
            else playWhenReady.current = !playWhenReady.current;
            setPending(!ready && playWhenReady.current);
          }}
          aria-label={playback.paused && !pending ? 'Play' : 'Pause'}
          aria-busy={pending}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d={playback.paused && !pending ? 'M4 2l10 6-10 6z' : 'M4 2h3v12H4zM9 2h3v12H9z'} />
          </svg>
        </button>
        <div className="player-controls__text">
          {/* Spotify requires a link back to Spotify wherever its content is shown. */}
          <a className="player-controls__title" href={song.url} target="_blank" rel="noreferrer">
            {song.title}
          </a>
          <span className="player-controls__artist">{song.artist}</span>
        </div>
      </div>
      <div
        className="player-controls__bar"
        role="progressbar"
        aria-label="Song progress"
        aria-valuemin={0}
        aria-valuemax={Math.round(playback.duration / 1000)}
        aria-valuenow={Math.round(playback.position / 1000)}
        style={{ '--progress': `${progress}%` }}
      />
    </div>
  );
}

export default function PlayerControls({ sound, playing, onTogglePlay, title, artist }) {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!sound) return undefined;
    const update = () => {
      // Howler returns itself rather than a number while the track is still loading.
      const time = sound.seek();
      if (typeof time === 'number') setPosition(time);
      setDuration(sound.duration());
    };
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [sound]);

  const seekTo = (time) => {
    sound?.seek(time);
    setPosition(time);
  };

  return (
    <div className="player-controls">
      <div className="player-controls__row">
        <button type="button" onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d={playing ? 'M4 2h3v12H4zM9 2h3v12H9z' : 'M4 2l10 6-10 6z'} />
          </svg>
        </button>
        <div className="player-controls__text">
          <span className="player-controls__title">{title}</span>
          <span className="player-controls__artist">{artist}</span>
        </div>
        {/* shortcut: only one song, so Next restarts it; move to the next track once there is a playlist or Spotify. */}
        <button type="button" onClick={() => seekTo(0)} aria-label="Next">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 2l8 6-8 6zM11 2h3v12h-3z" />
          </svg>
        </button>
      </div>
      <input
        className="player-controls__bar"
        type="range"
        min="0"
        max={duration || 1}
        step="0.1"
        value={position}
        onChange={(e) => seekTo(Number(e.target.value))}
        aria-label="Seek"
        aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
        style={{ '--progress': `${duration ? (position / duration) * 100 : 0}%` }}
      />
    </div>
  );
}
