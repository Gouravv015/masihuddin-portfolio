import { useEffect, useRef, useState } from 'react';
import FlipText from './FlipText.jsx';
import './BookShelf.css';

/*
 * Skills as a shelf of 3D books, inspired by Vengeance UI's Books Showcase but built with CSS 3D instead of
 * Three.js: no canvas, no per-frame loop. Every movement is a CSS transition fired by a state change, so an idle
 * shelf costs nothing.
 *
 * A wooden bookcase in real 3D (CSS 3D, no WebGL): three shelves, three books to a shelf, spine out. The case
 * turns gently toward the pointer so you can see its depth. Tapping a book swings it round to face you and opens
 * it to its index page while the case fades and the others drop away; inside an open book the arrows (or arrow
 * keys, or a swipe) move to the previous or next one.
 */

const VARIANTS = ['flame', 'ink', 'paper', 'ember'];
const pad = (n) => String(n).padStart(2, '0');

const PER_SHELF = 3;
const INNER = 1.5; // half the usable shelf width, in book depths (--book-w); the case is 3.4 wide
// A little irregularity, like real books: spine thickness and height (both relative to --book-w).
const THICK = [0.3, 0.26, 0.34, 0.28, 0.32, 0.25, 0.31, 0.27];
const TALL = [0.96, 1, 0.9, 0.94, 1, 0.88, 0.97, 0.92];
const LEAN_DEG = -11; // the last book on the top and bottom shelves leans on its neighbour

/**
 * Where each book stands (x in --book-w units from the case's centre, its shelf, thickness, height, lean), plus
 * the bookends. Shelves alternate: books grouped at the left, then at the right, leaving open space, as on a real
 * bookcase.
 */
function layout(count) {
  const books = [];
  const bookends = [];
  const shelves = Math.ceil(count / PER_SHELF);
  for (let row = 0; row < shelves; row++) {
    const ids = Array.from({ length: Math.min(PER_SHELF, count - row * PER_SHELF) }, (_, k) => row * PER_SHELF + k);
    const fromLeft = row % 2 === 0;
    const leans = row !== 1;
    let cursor = fromLeft ? -INNER + 0.22 : INNER - 0.22;
    (fromLeft ? ids : [...ids].reverse()).forEach((i, k, list) => {
      const t = THICK[i % THICK.length];
      const s = TALL[i % TALL.length];
      const lean = leans && k === list.length - 1;
      if (lean) cursor += (fromLeft ? 1 : -1) * 0.26; // room at the base for the tilt
      const x = cursor + ((fromLeft ? 1 : -1) * t) / 2;
      cursor += (fromLeft ? 1 : -1) * (t + 0.015);
      books[i] = { row, x, t, s, lean: lean ? LEAN_DEG * (fromLeft ? 1 : -1) : 0 };
    });
    if (!leans) bookends.push({ row, x: cursor + (fromLeft ? 0.05 : -0.05) });
  }
  return { books, bookends, shelves };
}

// The transform that stands a book on its shelf, spine out. Pushed back by half its depth so the spine lines up
// with the front of the shelf.
function shelfTransform({ row, x, lean }, shelves) {
  const y = row - (shelves - 1) / 2;
  return `translate3d(calc(${x} * var(--book-w)), calc(${y} * var(--tier)), calc(var(--book-w) * -0.5)) rotateZ(${lean}deg) rotateY(90deg)`;
}

/** The wooden case: back, sides, top, bottom and the shelves between, each a flat panel placed in 3D. */
function Case({ shelves, bookends }) {
  const planks = Array.from({ length: shelves + 1 }, (_, k) => k - shelves / 2); // shelf lines, top to bottom
  return (
    <>
      <span className="case__back" />
      <span className="case__side case__side--left" />
      <span className="case__side case__side--right" />
      <span className="case__post case__post--left" />
      <span className="case__post case__post--right" />
      {planks.map((k) => (
        <span key={k} style={{ '--k': k }}>
          <span className="case__plank" />
          <span className="case__lip" />
        </span>
      ))}
      {bookends.map(({ row, x }) => (
        <span key={row} className="case__bookend" style={{ '--x': x, '--row': row - (shelves - 1) / 2 }} />
      ))}
    </>
  );
}

// Where the other books go while one is open: they fall away below the shelf, a little scattered.
function awayTransform(offset) {
  const spin = ((offset * 37) % 23) - 11;
  return `translate3d(calc(${offset} * var(--book-w) * 0.9), 75vh, -200px) rotateZ(${spin}deg) rotateY(${offset * 20}deg)`;
}

// Official brand marks from Simple Icons (via Iconify), keyed by file name. A skill without a mark (Matplotlib
// has none) is simply left out of its cover.
const ICON_FILES = import.meta.glob('../assets/skill-icons/*.svg', { eager: true, query: '?url', import: 'default' });
const ICONS = Object.fromEntries(
  Object.entries(ICON_FILES).map(([path, url]) => [path.split('/').pop().replace('.svg', ''), url]),
);
const SLUGS = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python: 'python',
  Java: 'openjdk',
  HTML5: 'html5',
  CSS3: 'css',
  React: 'react',
  'Next.js': 'nextdotjs',
  'Three.js': 'threedotjs',
  'Tailwind CSS': 'tailwindcss',
  Bootstrap: 'bootstrap',
  Framer: 'framer',
  Vite: 'vite',
  'Node.js': 'nodedotjs',
  'Express.js': 'express',
  Django: 'django',
  FastAPI: 'fastapi',
  'Socket.io': 'socketdotio',
  JWT: 'jsonwebtokens',
  MongoDB: 'mongodb',
  PostgreSQL: 'postgresql',
  MySQL: 'mysql',
  Supabase: 'supabase',
  Firebase: 'firebase',
  AWS: 'amazonwebservices',
  Cloudflare: 'cloudflare',
  Vercel: 'vercel',
  Netlify: 'netlify',
  Git: 'git',
  GitHub: 'github',
  NumPy: 'numpy',
  SciPy: 'scipy',
  'scikit-learn': 'scikitlearn',
  OpenCV: 'opencv',
  Expo: 'expo',
  Electron: 'electron',
  Jest: 'jest',
  Cypress: 'cypress',
  Figma: 'figma',
};

/** A diagonal arrow (↗); the previous button mirrors it (↖). */
function ArrowIcon() {
  return (
    <svg className="shelf__arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 19 18.5 5.5M6.5 5.5h12v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The book's tool logos, tinted with the cover's accent colour. */
function Logos({ items }) {
  const logos = items.map((name) => ICONS[SLUGS[name]]).filter(Boolean);
  return (
    <span className="book__logos" aria-hidden="true">
      {logos.map((url) => (
        <span className="book__logo" key={url} style={{ '--logo': `url("${url}")` }} />
      ))}
    </span>
  );
}

export default function BookShelf({ books }) {
  const [center, setCenter] = useState(0);
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  const bookRefs = useRef([]);
  const swipe = useRef(null);
  const caseRef = useRef(null);
  const rootRef = useRef(null);
  const shelf = layout(books.length);

  // Entrance: the first time the bookcase scrolls into view it rises in and the books drop onto their shelves.
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setArrived(true);
        seen.disconnect();
      },
      { threshold: 0.35 },
    );
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  // The case turns a few degrees toward the pointer (mouse only); CSS transitions smooth it.
  const onPointerMove = (e) => {
    if (open || e.pointerType !== 'mouse' || !caseRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    caseRef.current.style.setProperty('--ry', `${-10 + px * 16}deg`);
    caseRef.current.style.setProperty('--rx', `${py * -6}deg`);
  };
  const onPointerLeave = () => {
    caseRef.current?.style.removeProperty('--ry');
    caseRef.current?.style.removeProperty('--rx');
  };

  const go = (to) => setCenter(Math.max(0, Math.min(books.length - 1, to)));
  const book = books[center];

  // Opening moves focus to the close button; closing returns it to the book.
  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);
  const close = () => {
    setOpen(false);
    bookRefs.current[center]?.focus({ preventScroll: true });
  };

  const onKeyDown = (e) => {
    if (!open) return; // on the shelf every book is already in view
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') go(center - 1);
    if (e.key === 'ArrowRight') go(center + 1);
  };

  // Swipe on touch screens.
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') swipe.current = e.clientX;
  };
  const onPointerUp = (e) => {
    if (swipe.current === null || !open) return;
    const dx = e.clientX - swipe.current;
    swipe.current = null;
    if (Math.abs(dx) > 40) go(center + (dx < 0 ? 1 : -1));
  };

  return (
    <div
      ref={rootRef}
      className={`shelf${open ? ' shelf--open' : ''}${arrived ? ' shelf--in' : ''}`}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="shelf__stage">
        <div className="case" ref={caseRef} style={{ '--shelves': shelf.shelves }}>
          <span className="case__frame" aria-hidden="true">
            <Case shelves={shelf.shelves} bookends={shelf.bookends} />
          </span>
          {books.map((item, i) => {
            const offset = i - center;
            const isCenter = offset === 0;
            const hidden = open && !isCenter;
            return (
              <button
                key={item.group}
                ref={(el) => (bookRefs.current[i] = el)}
                type="button"
                className={`book book--${VARIANTS[i % VARIANTS.length]}${isCenter ? ' book--center' : ''}`}
                style={{
                  transform:
                    open && !isCenter
                      ? awayTransform(offset)
                      : open
                        ? undefined
                        : shelfTransform(shelf.books[i], shelf.shelves),
                  transformOrigin: !open && shelf.books[i].lean ? '50% 100%' : undefined, // leans from its base
                  zIndex: open && isCenter ? 20 : 10,
                  '--book-t': `calc(var(--book-w) * ${shelf.books[i].t})`,
                  '--book-h': `calc(var(--book-w) * ${(1.42 * shelf.books[i].s).toFixed(3)})`,
                  '--d': `${(0.08 * i + 0.12 * shelf.books[i].row).toFixed(2)}s`, // entrance stagger
                }}
                data-hidden={hidden || undefined}
                tabIndex={hidden || (open && isCenter) ? -1 : 0}
                aria-hidden={hidden || undefined}
                aria-label={`${item.group}: open to see ${item.items.length} skills`}
                onClick={() => {
                  setCenter(i);
                  setOpen(true);
                }}
              >
                <span className="book__body">
                  <span className="book__back" />
                  <span className="book__spine">
                    <span>{item.group}</span>
                  </span>
                  <span className="book__edge" />
                  {/* The first page, revealed when the cover swings open. */}
                  <span className="book__page" aria-hidden="true">
                    <span className="book__page-title">Index</span>
                    {item.items.map((skill, n) => (
                      <span className="book__page-row" key={skill}>
                        <span>{skill}</span>
                        <span>{pad(n * 7 + 3)}</span>
                      </span>
                    ))}
                  </span>
                  <span className="book__cover">
                    <span className="book__front">
                      <span className="book__no">{pad(i + 1)}</span>
                      <Logos items={item.items} />
                      <span className="book__title">{item.group}</span>
                      <span className="book__count">{item.items.length} skills</span>
                    </span>
                    <span className="book__inside" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Previous / next, shown only inside an open book (spread to the lower corners). */}
      <div className="shelf__nav" aria-hidden={!open} inert={!open}>
        <button
          type="button"
          className="shelf__arrow shelf__arrow--prev"
          onClick={() => go(center - 1)}
          disabled={center === 0}
          aria-label="Previous book"
        >
          <ArrowIcon />
        </button>
        <button
          type="button"
          className="shelf__arrow"
          onClick={() => go(center + 1)}
          disabled={center === books.length - 1}
          aria-label="Next book"
        >
          <ArrowIcon />
        </button>
      </div>

      <section className="shelf__detail" aria-hidden={!open} inert={!open} aria-labelledby="shelf-detail-title">
        <button type="button" className="shelf__close" ref={closeRef} onClick={close}>
          <FlipText>Close ✕</FlipText>
        </button>
        {/* Keyed by book, so switching books while open re-runs their entrance (see .shelf__swap). */}
        <h3 className="shelf__detail-title shelf__swap" id="shelf-detail-title" key={`t${center}`}>
          {book.group}
        </h3>
        <p className="shelf__detail-blurb shelf__swap" key={`b${center}`}>
          {book.blurb}
        </p>
        <ul className="shelf__detail-skills shelf__swap" key={`s${center}`}>
          {book.items.map((skill, n) => (
            <li key={skill} style={{ '--n': n }}>
              {skill}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
