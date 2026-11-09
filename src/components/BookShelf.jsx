import { useEffect, useRef, useState } from 'react';
import FlipText from './FlipText.jsx';
import './BookShelf.css';

/*
 * Skills as a shelf of 3D books, inspired by Vengeance UI's Books Showcase but built with CSS 3D instead of
 * Three.js: no canvas, no per-frame loop. Every movement is a CSS transition fired by a state change, so an idle
 * shelf costs nothing.
 *
 * Three books stand fanned out; arrows, swipes, arrow keys or clicking a side book bring another to the middle.
 * Clicking the middle book sends the others away, opens it to its index page and shows the details beside it.
 */

const VARIANTS = ['flame', 'ink', 'paper', 'ember'];
const pad = (n) => String(n).padStart(2, '0');

// Where a book sits on the shelf, from its distance to the middle one.
function shelfTransform(offset) {
  const side = Math.sign(offset);
  const far = Math.abs(offset);
  if (far === 0) return 'translate3d(0, 0, 0) rotateY(-18deg)';
  if (far === 1) return `translate3d(calc(${side} * var(--book-w) * 1.18), 0, -160px) rotateY(${side * -32 - 8}deg)`;
  return `translate3d(calc(${side} * var(--book-w) * 2.1), 0, -420px) rotateY(${side * -50}deg)`;
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
    if (e.key === 'Escape' && open) close();
    // Arrow keys move between books whether a book is open or not.
    if (e.key === 'ArrowLeft') go(center - 1);
    if (e.key === 'ArrowRight') go(center + 1);
  };

  // Swipe on touch screens.
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') swipe.current = e.clientX;
  };
  const onPointerUp = (e) => {
    if (swipe.current === null || open) return;
    const dx = e.clientX - swipe.current;
    swipe.current = null;
    if (Math.abs(dx) > 40) go(center + (dx < 0 ? 1 : -1));
  };

  return (
    <div
      className={`shelf${open ? ' shelf--open' : ''}`}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div className="shelf__stage">
        {books.map((item, i) => {
          const offset = i - center;
          const isCenter = offset === 0;
          const hidden = open ? !isCenter : Math.abs(offset) > 2;
          return (
            <button
              key={item.group}
              ref={(el) => (bookRefs.current[i] = el)}
              type="button"
              className={`book book--${VARIANTS[i % VARIANTS.length]}${isCenter ? ' book--center' : ''}`}
              style={{
                transform: open && !isCenter ? awayTransform(offset) : open ? undefined : shelfTransform(offset),
                zIndex: 10 - Math.abs(offset),
              }}
              data-hidden={hidden || undefined}
              tabIndex={hidden || (open && isCenter) ? -1 : 0}
              aria-hidden={hidden || undefined}
              aria-label={isCenter ? `${item.group}: open to see ${item.items.length} skills` : `Show ${item.group}`}
              onClick={() => (isCenter ? setOpen(true) : go(i))}
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
                    <Logos items={item.items} />
                    <span className="book__title">{item.group}</span>
                  </span>
                  <span className="book__inside" />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* The same two arrows on the shelf and in an open book; when open they spread to the lower corners. */}
      <div className="shelf__nav">
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
          <FlipText>Close</FlipText>
          <svg className="shelf__close-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
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
