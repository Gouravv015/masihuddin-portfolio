import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

// Slightly under critical damping (2 * sqrt(STIFFNESS) = 26), so the circle overshoots a touch before settling.
const STIFFNESS = 170;
const DAMPING = 20;
const MAX_STRETCH = 0.45;
const SPEED_FOR_MAX_STRETCH = 2500; // px per second
const HOVER_SCALE = 2.5;

export default function CursorFollower() {
  const ref = useRef(null);
  const [hasMouse] = useState(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  useEffect(() => {
    if (!hasMouse) return undefined;
    const el = ref.current;
    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };
    let visible = false;
    let targetScale = 1;
    let scale = 1;
    let stretch = 0;
    let angle = 0;

    const onMove = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      // Over project rows the preview card follows the pointer instead, so the circle steps aside.
      if (e.target.closest?.('.work__row, .shelf__arrow')) targetScale = 0;
      else targetScale = e.target.closest?.('a, button') ? HOVER_SCALE : 1;
      if (!visible) {
        // Appear at the cursor rather than flying in from wherever it left.
        pos.x = target.x;
        pos.y = target.y;
        vel.x = 0;
        vel.y = 0;
        visible = true;
        el.style.opacity = 1;
      }
    };
    const onLeave = () => {
      visible = false;
      el.style.opacity = 0;
    };

    const tick = (_time, deltaMs) => {
      const dt = Math.min(deltaMs, 32) / 1000; // A long frame would otherwise make the spring explode.
      for (const axis of ['x', 'y']) {
        vel[axis] += (STIFFNESS * (target[axis] - pos[axis]) - DAMPING * vel[axis]) * dt;
        pos[axis] += vel[axis] * dt;
      }

      const speed = Math.hypot(vel.x, vel.y);
      if (speed > 20) angle = Math.atan2(vel.y, vel.x);
      const targetStretch = Math.min(speed / SPEED_FOR_MAX_STRETCH, 1) * MAX_STRETCH;
      const ease = 1 - Math.exp(-dt * 18);
      stretch += (targetStretch - stretch) * ease;
      scale += (targetScale - scale) * ease;

      // At rest (on target, not stretched, scale settled) there's nothing to update.
      const settled =
        Math.abs(target.x - pos.x) < 0.1 &&
        Math.abs(target.y - pos.y) < 0.1 &&
        Math.abs(vel.x) + Math.abs(vel.y) < 0.1 &&
        Math.abs(targetScale - scale) < 0.001 &&
        stretch < 0.001;
      if (settled && el.dataset.settled) return;
      el.dataset.settled = settled ? '1' : '';
      el.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) rotate(${angle}rad) scale(${scale * (1 + stretch)}, ${scale * (1 - stretch * 0.6)})`;
    };

    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', onLeave);
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      gsap.ticker.remove(tick);
    };
  }, [hasMouse]);

  return hasMouse ? <div className="cursor-follower" ref={ref} aria-hidden="true" /> : null;
}
