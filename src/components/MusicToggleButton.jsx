import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import useSound from 'use-sound';
import cover from '../assets/cover.svg';
import PlayerControls, { LiveControls, loadEmbedApi } from './PlayerControls.jsx';
import SongCard from './SongCard.jsx';

// Put the track at public/audio/music.mp3.
const MUSIC_SRC = `${import.meta.env.BASE_URL}audio/music.mp3`;
const SONG = { title: 'Binbataye', artist: 'Gadadharadas', image: cover };
const BARS = 5;
const POLL_MS = 20000;

const getRandomHeights = () => Array.from({ length: BARS }, () => Math.random() * 0.8 + 0.2);

const MAGNET_RADIUS = 80; // px from the button's centre
const MAGNET_STRENGTH = 0.15; // share of the pointer's offset the button follows

export const MusicToggleButton = ({ className }) => {
  const [heights, setHeights] = useState(getRandomHeights);
  const [isPlaying, setIsPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [wantsPlay, setWantsPlay] = useState(false);
  // Your Spotify song: the one playing now, or the last one played. Null only if Spotify can't be reached.
  const [live, setLive] = useState(null);
  const buttonRef = useRef(null);

  // Magnet: within MAGNET_RADIUS the button leans toward the pointer, then springs home when it leaves.
  const pullX = useMotionValue(0);
  const pullY = useMotionValue(0);
  const x = useSpring(pullX, { stiffness: 220, damping: 16, mass: 0.6 });
  const y = useSpring(pullY, { stiffness: 220, damping: 16, mass: 0.6 });
  // The bars lean a little further than the button, which gives the pull some depth.
  const barsX = useTransform(x, (v) => v * 0.35);
  const barsY = useTransform(y, (v) => v * 0.35);
  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduced) return undefined;
    const onMove = (e) => {
      const rect = buttonRef.current.getBoundingClientRect();
      // Measured from the resting centre, so the button's own offset doesn't feed back into the pull.
      const dx = e.clientX - (rect.left + rect.width / 2 - x.get());
      const dy = e.clientY - (rect.top + rect.height / 2 - y.get());
      const near = Math.hypot(dx, dy) < MAGNET_RADIUS;
      pullX.set(near ? dx * MAGNET_STRENGTH : 0);
      pullY.set(near ? dy * MAGNET_STRENGTH : 0);
    };
    const release = () => {
      pullX.set(0);
      pullY.set(0);
    };
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', release);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', release);
    };
  }, [pullX, pullY, x, y]);
  const soundId = useRef();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const data = await (await fetch('/api/now-playing')).json();
        if (!cancelled) setLive(data.uri ? data : null);
      } catch {
        if (!cancelled) setLive(null); // No API (plain static hosting) or offline: fall back to the local track.
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);

  const [, { sound }] = useSound(MUSIC_SRC, {
    loop: true,
    html5: true, // Streams the track instead of downloading and decoding all of it first.
    onplay: () => setIsPlaying(true),
    onpause: () => setIsPlaying(false),
    onstop: () => setIsPlaying(false),
  });

  const animateBars = isPlaying || Boolean(live?.isPlaying);
  useEffect(() => {
    if (animateBars) {
      const waveformIntervalId = setInterval(() => {
        setHeights(getRandomHeights());
      }, 100);
      return () => clearInterval(waveformIntervalId);
    }
    setHeights(Array(BARS).fill(0.1));
    return undefined;
  }, [animateBars]);

  // Toggle on wantsPlay, not isPlaying: onplay fires late, and a second click before then would start a second copy.
  const setPlayback = (shouldPlay) => {
    setWantsPlay(shouldPlay);
    if (shouldPlay) {
      // Reuse one id: without it Howler can spawn a new copy from 0:00 on each play. isPlaying follows onplay.
      soundId.current = sound?.play(soundId.current);
    } else {
      sound?.pause(soundId.current);
      setIsPlaying(false);
    }
  };

  // With a Spotify song on the card, the local track must not keep playing underneath it.
  const isLive = Boolean(live);
  useEffect(() => {
    if (isLive && sound) {
      sound.pause(soundId.current);
      setWantsPlay(false);
      setIsPlaying(false);
    }
  }, [isLive, sound]);

  // Fetch Spotify's player script while you're live, so the card's play button is ready sooner.
  useEffect(() => {
    if (isLive) loadEmbedApi();
  }, [isLive]);

  const handleClick = () => {
    setOpen(!open);
    // Opening while you're on Spotify only shows your song; closing always stops the local track.
    if (open || !live) setPlayback(!open);
  };

  const song = live ?? SONG;

  return (
    <>
    <SongCard open={open} anchorRef={buttonRef} imageSrc={song.image} title={song.title} artist={song.artist}>
      {live ? (
        <LiveControls song={live} />
      ) : (
        <PlayerControls
          sound={sound}
          playing={wantsPlay}
          onTogglePlay={() => setPlayback(!wantsPlay)}
          title={SONG.title}
          artist={SONG.artist}
        />
      )}
    </SongCard>
    <motion.button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      aria-label={open ? 'Close music player' : 'Open music player'}
      aria-expanded={open}
      initial={{ padding: '14px 14px' }}
      whileHover={{ padding: '18px 22px' }}
      whileTap={{ padding: '18px 22px' }}
      transition={{ duration: 1, bounce: 0.6, type: 'spring' }}
      className={className}
      style={{ x, y }}
    >
      <motion.span
        style={{ x: barsX, y: barsY }}
        initial={{ opacity: 0, filter: 'blur(4px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ type: 'spring', bounce: 0.35 }}
        className="music-toggle__bars"
      >
        {heights.map((height, index) => (
          <motion.span
            key={index}
            className="music-toggle__bar"
            initial={{ height: 1 }}
            animate={{ height: Math.max(4, height * 14) }}
            transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          />
        ))}
      </motion.span>
    </motion.button>
    </>
  );
};

/**
 * Skiper 25 Micro Interactions_005 — React + framer motion + use-sound
 *
 * License & Usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 * - No attribution required with Skiper UI Pro.
 *
 * Feedback and contributions are welcome.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.me
 * Twitter: https://x.com/Gur__vi
 */
