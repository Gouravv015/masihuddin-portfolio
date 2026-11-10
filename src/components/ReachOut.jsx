import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './ReachOut.css';

/*
 * After "Let's talk": two hands, drawn as ASCII art on canvas, reach in from the edges, then a "Send message"
 * button pops up between them. Hovering lights up little clusters of the hands' characters. The button opens a
 * message box over the blurred page.
 *
 * The hands are ported from Vengeance UI's Animated Footer (MIT, credited in the page footer), trimmed to what
 * this page uses and recoloured for the site.
 */

const CHARS = '........:::=+xX#0369'; // dark to light
const COLUMNS = 80;
const CELL = 20; // px per character cell
const FONT = 18;
const GLYPH = '#803500';
const LIT = '#ff6027';
const LIT_GLYPH = '#0e0e0e';
const LIT_FOR = 300; // ms a lit cell stays lit
const CLUSTER = 10; // most cells one hover lights up
const HOVER_RADIUS = 8; // in cells
const PARALLAX = 16; // px
const OFF = 125; // % a hand sits off its edge before it reaches in

const base = import.meta.env.BASE_URL;
const IMAGES = [`${base}hands/hand-left.jpg`, `${base}hands/hand-right.jpg`];

// Sample an image's brightness into a grid of characters, skipping the background.
function sampleCells(image) {
  const rows = Math.max(1, Math.round(COLUMNS / (image.naturalWidth / image.naturalHeight || 1)));
  const sampler = document.createElement('canvas');
  sampler.width = COLUMNS;
  sampler.height = rows;
  const ctx = sampler.getContext('2d');
  ctx.drawImage(image, 0, 0, COLUMNS, rows);
  const px = ctx.getImageData(0, 0, COLUMNS, rows).data;
  const background = CHARS.lastIndexOf('.');
  const cells = new Map();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const o = (row * COLUMNS + col) * 4;
      const brightness = (px[o] * 0.299 + px[o + 1] * 0.587 + px[o + 2] * 0.114) / 255;
      const index = Math.min(CHARS.length - 1, Math.floor((1 - brightness) * CHARS.length));
      if (index > background) cells.set(`${col},${row}`, { col, row, char: CHARS[index], litUntil: 0 });
    }
  }
  return { rows, cells };
}

// Light a short wandering trail of neighbouring cells, starting from one.
function lightCluster(cells, start) {
  const now = Date.now();
  start.litUntil = now + LIT_FOR;
  const lit = [start];
  let current = start;
  const steps = Math.floor(Math.random() * CLUSTER) + 1;
  for (let step = 0; step < steps; step++) {
    const next = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const n = (dx || dy) && cells.get(`${current.col + dx},${current.row + dy}`);
        if (n && !lit.includes(n)) next.push(n);
      }
    if (!next.length) break;
    current = next[Math.floor(Math.random() * next.length)];
    current.litUntil = now + LIT_FOR + step * 10;
    lit.push(current);
  }
}

export default function ReachOut({ email, onDialogChange }) {
  const rootRef = useRef(null);
  const handRefs = [useRef(null), useRef(null)];
  const canvasRefs = [useRef(null), useRef(null)];
  const buttonRef = useRef(null);
  const dialogRef = useRef(null);
  const [sent, setSent] = useState(null); // null, 'sent', or 'unset' (no address to send to yet)

  useEffect(() => {
    const root = rootRef.current;
    const wraps = handRefs.map((r) => r.current);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hands = [];

    IMAGES.forEach((src, i) => {
      const image = new Image();
      image.onload = () => {
        const { rows, cells } = sampleCells(image);
        const canvas = canvasRefs[i].current;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = COLUMNS * CELL * dpr;
        canvas.height = rows * CELL * dpr;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.font = `${FONT}px monospace`;
        ctx.textAlign = 'center';
        const m = ctx.measureText('X');
        const baseline = CELL / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
        hands.push({ canvas, ctx, rows, cells, list: [...cells.values()], baseline });
        draw(true);
      };
      image.src = src;
    });

    const paint = (hand, now) => {
      const { ctx, list, rows, baseline } = hand;
      ctx.clearRect(0, 0, COLUMNS * CELL, rows * CELL);
      for (const cell of list) {
        const x = cell.col * CELL;
        const y = cell.row * CELL;
        const lit = cell.litUntil > now;
        if (lit) {
          ctx.fillStyle = LIT;
          ctx.fillRect(x, y, CELL, CELL);
        }
        ctx.fillStyle = lit ? LIT_GLYPH : GLYPH;
        ctx.fillText(cell.char, x + CELL / 2, y + baseline);
      }
    };

    // Pointer: lights the nearest cells and nudges the hands (parallax). Mouse and trackpad only.
    const pointer = { x: 0, y: 0 };
    const drift = { x: 0, y: 0 };
    const reach = { offset: reduced ? 0 : OFF };
    let litSince = 0; // repaint while any cell is still lit
    const onMove = (e) => {
      const r = root.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width - 0.5) * PARALLAX * 2;
      pointer.y = ((e.clientY - r.top) / r.height - 0.5) * PARALLAX * 2;
      for (const hand of hands) {
        const c = hand.canvas.getBoundingClientRect();
        if (!c.width) continue;
        const col = ((e.clientX - c.left) / c.width) * COLUMNS;
        const row = ((e.clientY - c.top) / c.height) * hand.rows;
        let best = null;
        let gap = Infinity;
        for (const cell of hand.list) {
          const d = Math.hypot(col - cell.col, row - cell.row);
          if (d < gap) [gap, best] = [d, cell];
        }
        if (best && gap <= HOVER_RADIUS) {
          lightCluster(hand.cells, best);
          litSince = Date.now();
        }
      }
    };
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (finePointer) root.addEventListener('mousemove', onMove);

    function draw(force) {
      const now = Date.now();
      if (force || now - litSince < LIT_FOR + 200) for (const hand of hands) paint(hand, now);
      drift.x += (pointer.x - drift.x) * 0.05;
      drift.y += (pointer.y - drift.y) * 0.05;
      wraps.forEach((wrap, i) => {
        const dir = i === 0 ? 1 : -1;
        wrap.style.transform = `translateX(${-dir * reach.offset}%) translate(${(drift.x * dir).toFixed(1)}px, ${(-drift.y).toFixed(1)}px)`;
      });
    }

    // Only animate while the section is on screen.
    let onScreen = false;
    const tick = () => onScreen && draw(false);
    gsap.ticker.add(tick);

    // The hands reach in once the section is mostly on screen, then the button pops up; both reverse on the way out.
    const reveal = gsap
      .timeline({ paused: true })
      .to(reach, { offset: 0, duration: 1.2, ease: 'power3.out' })
      .fromTo(
        buttonRef.current,
        { scale: 0, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'back.out(2.2)' },
        '-=0.25',
      );
    if (reduced) reveal.progress(1);
    const seen = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (reduced) return;
        if (entry.intersectionRatio >= 0.5) reveal.timeScale(1).play();
        else if (!entry.isIntersecting) reveal.timeScale(2.5).reverse();
      },
      { threshold: [0, 0.5] },
    );
    seen.observe(root);

    return () => {
      gsap.ticker.remove(tick);
      seen.disconnect();
      reveal.kill();
      root.removeEventListener('mousemove', onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = () => {
    setSent(null);
    dialogRef.current.showModal();
    onDialogChange?.(true);
  };
  const close = () => dialogRef.current.close(); // the dialog's close event reports it

  // shortcut: sends through the visitor's email app (mailto); swap for a form service to send from the page itself.
  const submit = (e) => {
    e.preventDefault();
    if (!email) return setSent('unset');
    const data = new FormData(e.currentTarget);
    const body = `${data.get('message')}\n\n${data.get('name')} (${data.get('from')})`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Message from ${data.get('name')}`)}&body=${encodeURIComponent(body)}`;
    setSent('sent');
  };

  return (
    <section className="reach" id="message" ref={rootRef} aria-label="Send a message">
      <div className="reach__hands" aria-hidden="true">
        {canvasRefs.map((ref, i) => (
          <div className="reach__hand" ref={handRefs[i]} key={i}>
            <canvas ref={ref} />
          </div>
        ))}
      </div>

      <button className="reach__button" type="button" ref={buttonRef} onClick={open}>
        Send message
      </button>

      <dialog
        className="reach__dialog"
        ref={dialogRef}
        aria-labelledby="reach-title"
        data-lenis-prevent
        onClose={() => onDialogChange?.(false)}
        onClick={(e) => e.target === e.currentTarget && close()} // a click on the blurred backdrop closes it
      >
        <div className="reach__box">
          <button className="reach__close" type="button" onClick={close} aria-label="Close">
            Close
          </button>
          <h2 className="reach__title" id="reach-title">
            Send a message
          </h2>
          {sent === 'sent' ? (
            <p className="reach__note">Your email app should have opened with the message ready to send.</p>
          ) : sent === 'unset' ? (
            <p className="reach__note">Messages aren&apos;t connected yet. Check back soon.</p>
          ) : (
            <form className="reach__form" onSubmit={submit}>
              <label>
                Name
                <input name="name" autoComplete="name" required />
              </label>
              <label>
                Email
                <input name="from" type="email" autoComplete="email" required />
              </label>
              <label>
                Message
                <textarea name="message" rows="5" required />
              </label>
              <button className="reach__send" type="submit">
                Send
              </button>
            </form>
          )}
        </div>
      </dialog>
    </section>
  );
}
