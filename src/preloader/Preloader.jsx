import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import NumberFlow from '@number-flow/react';
import './preloader.css';
import { PRELOADER_CONFIG as config } from './config.js';
import { DOT, DOT_ORIGIN, GLYPH, HOOK_PATH } from './glyph.js';

gsap.registerPlugin(CustomEase);
const EASE_IN_OUT = CustomEase.create('preloader-in-out', 'M0,0 C0.42,0 0.58,1 1,1');
const EASE_ZOOM = CustomEase.create('preloader-zoom', 'M0,0 C0.895,0.03 0.685,0.22 1,1');

const SESSION_KEY = 'preloader-shown';
const seconds = (ms) => ms / 1000;

const LIQUID_MASK = 'preloader-liquid';
const MAX_WAVE = 16; // viewBox units; the swell peaks mid-fill and settles flat when full
const MAX_SLOSH = 10; // how far the surface tilts side to side, in viewBox units at each edge

// The liquid surface: two long sines drifting in opposite directions plus a slow side-to-side slosh.
// `level` is the fraction filled, so the surface height always matches the counter.
function wavePath(level, time, phase) {
  const { width, height } = GLYPH;
  const swell = Math.sin(Math.PI * level); // calm when empty and when full
  const amp = MAX_WAVE * swell;
  const tilt = MAX_SLOSH * swell * Math.sin(time * 1.3 + phase);
  const surface = height * (1 - level);
  let d = `M0 ${height + 1}`;
  for (let x = 0; x <= width; x += 4) {
    const u = x / width;
    const wave = 0.65 * Math.sin(u * Math.PI * 2 + time * 1.8 + phase) + 0.35 * Math.sin(u * Math.PI * 4.6 - time * 2.6 + phase);
    d += `L${x} ${(surface + amp * wave + tilt * (u * 2 - 1)).toFixed(2)}`;
  }
  return `${d}L${width} ${height + 1}Z`;
}

function Glyph({ fill, children, mask }) {
  return (
    <svg
      className="preloader__glyph"
      viewBox={`0 0 ${GLYPH.width} ${GLYPH.height}`}
      fill={fill}
      aria-hidden="true"
      focusable="false"
    >
      {children}
      <g className={mask ? 'preloader__liquid' : undefined} mask={mask}>
        <path d={HOOK_PATH} />
        <rect x={DOT.x} y={DOT.y} width={DOT.size} height={DOT.size} />
      </g>
    </svg>
  );
}

export default function Preloader({ onComplete }) {
  const rootRef = useRef(null);
  const backdropRef = useRef(null);
  const markRef = useRef(null);
  const timerRef = useRef(null);
  const frontWaveRef = useRef(null);
  const backWaveRef = useRef(null);
  const [count, setCount] = useState(config.timer.from);

  // Latest callback without restarting the animation when a parent re-renders.
  const onCompleteRef = useRef(onComplete);
  useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useLayoutEffect(() => {
    const html = document.documentElement;

    if (config.oncePerSession && sessionStorage.getItem(SESSION_KEY)) {
      html.classList.remove('is-preloading');
      onCompleteRef.current?.();
      return undefined;
    }
    html.classList.add('is-preloading');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const liquid = { level: 0 };
    const drawLiquid = () => {
      const time = gsap.ticker.time;
      frontWaveRef.current.setAttribute('d', wavePath(liquid.level, time, 0));
      // A fainter wave out of phase behind the front one gives the liquid some depth.
      backWaveRef.current.setAttribute('d', wavePath(liquid.level, time * 0.85, 2.4));
    };

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem(SESSION_KEY, 'true');
          onCompleteRef.current?.();
        },
      });

      if (reducedMotion) {
        const { fill, hold, fade } = config.reducedMotionTimings;
        setCount(config.timer.to);
        liquid.level = 1;
        drawLiquid();
        timeline
          .fromTo('.preloader__liquid', { opacity: 0 }, { opacity: 1, duration: seconds(fill), ease: 'none' })
          .to(rootRef.current, { opacity: 0, duration: seconds(fade), ease: 'none' }, `+=${seconds(hold)}`);
        return;
      }

      const { fill, hold, zoom, backdropDelay, backdropFade } = config.timings;
      const { from, to, step } = config.timer;
      const fillDuration = seconds(fill);
      const zoomStart = fillDuration + seconds(hold);

      // One value drives both, so the number always says how full the mark looks.
      let shown = from;
      const onFill = () => {
        drawLiquid();
        const value = Math.min(to, from + Math.floor((liquid.level * (to - from)) / step + 1e-6) * step);
        if (value !== shown) {
          shown = value;
          setCount(value);
        }
      };
      drawLiquid();
      timeline.to(liquid, { level: 1, duration: fillDuration, ease: EASE_IN_OUT, onUpdate: onFill }, 0);

      // Timer slides in, then leaves just before the zoom.
      timeline.fromTo(
        timerRef.current,
        { opacity: 0, x: -100 },
        { opacity: 1, x: 0, duration: 0.5, ease: EASE_IN_OUT },
        0,
      );
      timeline.to(timerRef.current, { opacity: 0, duration: 0.2, ease: EASE_IN_OUT }, zoomStart - 0.2);

      // The whole mark scales from the centre of the dot and fades as it passes the camera.
      timeline.to(
        markRef.current,
        { scale: config.zoomScale, opacity: 0, duration: seconds(zoom), ease: EASE_ZOOM },
        zoomStart,
      );
      timeline.to(
        backdropRef.current,
        { opacity: 0, duration: seconds(backdropFade), ease: EASE_IN_OUT },
        zoomStart + seconds(backdropDelay),
      );
    }, rootRef);

    return () => {
      context.revert();
      html.classList.remove('is-preloading');
    };
  }, []);

  const { colors } = config;

  return (
    <div className="preloader" ref={rootRef} role="status" aria-label="Loading">
      <div className="preloader__backdrop" ref={backdropRef} style={{ background: colors.background }} />
      <div className="preloader__mark" ref={markRef} style={{ transformOrigin: DOT_ORIGIN }}>
        <Glyph fill={colors.glyph} />
        <Glyph fill={colors.fill} mask={`url(#${LIQUID_MASK})`}>
          {/* Mask luminance: the back wave shows the liquid at partial strength, the front wave in full. */}
          <mask id={LIQUID_MASK} maskUnits="userSpaceOnUse" x="0" y="0" width={GLYPH.width} height={GLYPH.height}>
            <path ref={backWaveRef} fill="#5a5a5a" />
            <path ref={frontWaveRef} fill="#fff" />
          </mask>
        </Glyph>
      </div>
      <div className="preloader__timer" ref={timerRef} style={{ color: colors.timer }} aria-hidden="true">
        {/* Quick rolls, so the number keeps pace with the liquid instead of trailing it. */}
        <NumberFlow value={count} spinTiming={{ duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }} />
      </div>
    </div>
  );
}
