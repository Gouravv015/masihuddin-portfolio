/** Every tunable for the preloader lives here, except the first-paint colour in index.html. */
export const PRELOADER_CONFIG = {
  /** Stage durations in milliseconds. */
  timings: {
    /** Liquid rises through the ghost glyph; the counter runs for the same time. */
    fill: 4000,
    hold: 1000,
    zoom: 600,
    /** The backdrop starts fading this long after the zoom starts. */
    backdropDelay: 500,
    backdropFade: 500,
  },

  /** Shortened sequence used under prefers-reduced-motion: no wipe, no zoom. */
  reducedMotionTimings: {
    fill: 400,
    hold: 200,
    fade: 300,
  },

  /** How far the camera pushes into the dot. */
  zoomScale: 35,

  timer: {
    from: 0,
    to: 100,
    step: 1,
  },

  colors: {
    background: '#0B0B0B',
    glyph: '#383838',
    fill: '#F5F5F5',
    timer: '#F5F5F5',
  },

  /** Play once per browser session in production; development replays on every reload. */
  oncePerSession: import.meta.env.PROD,
};
