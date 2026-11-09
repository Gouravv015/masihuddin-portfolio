import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const LETTERS = ['W', 'O', 'R', 'K'];
const PER_ROW = 40;
const GAP_EM = 0.05; // space between letters
const SCROLL_RATIO = 0.6; // px of sideways travel per px scrolled
const RADIUS_RATIO = 1.1; // cylinder radius as a share of the gallery width
const MAX_ANGLE = 1.0; // radians; past this a letter or card is well off screen (or too close to the camera) and is hidden

/**
 * The W-O-R-K background and project cards, seen from inside a cylinder: the middle sits
 * farthest away, and toward the edges the wall curves round toward you, so things grow and turn inward.
 * Rows travel sideways only as you scroll (in alternating directions), including while the
 * section is pinned and the cards slide across.
 */
export default function WorkWall() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const reel = root.parentElement;
    const strip = reel.querySelector('.work-reel__strip');
    const cards = strip ? [...strip.children] : [];
    const rows = [...root.querySelectorAll('.work-wall__row')].map((row, index) => ({
      letters: [...row.children],
      dir: index % 2 ? 1 : -1,
      stagger: index * 61, // so the rows' letters don't line up
      step: 0,
      width: 0,
    }));
    let width = 0;
    let radius = 1;
    let cardCentres = [];
    let lastScroll = NaN;
    let lastStripX = NaN;
    // Read once per scroll event instead of every frame, so reading it never forces a style recalculation.
    let scrollY = window.scrollY;
    const onScroll = () => (scrollY = window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    const scrollPos = () => scrollY;
    // Only write visibility when it actually changes: rewriting it on 160 letters a frame invalidated styles.
    const show = (el, hidden) => {
      if (el.hidden_ === hidden) return;
      el.hidden_ = hidden;
      el.style.visibility = hidden ? 'hidden' : '';
    };

    // Where a point `flat` px from the centre lands once wrapped onto the cylinder.
    const wrap = (flat) => {
      const angle = flat / radius;
      return {
        angle,
        x: radius * Math.sin(angle),
        z: radius - radius * Math.cos(angle), // toward the camera at the edges: we're inside
        hidden: Math.abs(angle) > MAX_ANGLE,
      };
    };

    const measure = () => {
      width = reel.clientWidth;
      radius = width * RADIUS_RATIO;
      const fontSize = parseFloat(getComputedStyle(root).fontSize);
      rows.forEach((row) => {
        row.width = row.letters[0].offsetWidth;
        row.step = row.width + GAP_EM * fontSize;
      });
      cardCentres = cards.map((card) => card.offsetLeft + card.offsetWidth / 2);
      lastScroll = NaN; // force the next frame to redraw
    };

    const draw = () => {
      const scroll = scrollPos();
      // GSAP's own cache of the strip's x (its documented _gsap store): no computed-style read per frame.
      const stripX = strip ? parseFloat(strip._gsap?.x) || 0 : 0;
      // Nothing moved since the last frame: skip all the DOM writes.
      if (scroll === lastScroll && stripX === lastStripX) return;
      lastScroll = scroll;
      lastStripX = stripX;
      const scrolled = scroll * SCROLL_RATIO;
      rows.forEach((row) => {
        const loop = row.step * row.letters.length;
        const offset = row.dir * scrolled + row.stagger;
        row.letters.forEach((letter, i) => {
          const flat = gsap.utils.wrap(-loop / 2, loop / 2, i * row.step + offset);
          const p = wrap(flat);
          show(letter, p.hidden);
          if (p.hidden) return;
          const x = width / 2 + p.x - row.width / 2;
          letter.style.transform = `translate3d(${x.toFixed(1)}px, -50%, ${p.z.toFixed(1)}px) rotateY(${(-p.angle).toFixed(4)}rad)`;
        });
      });

      // Cards: GSAP slides the strip flat; here each card is bent onto the same cylinder.
      cards.forEach((card, i) => {
        const flat = stripX + cardCentres[i] - width / 2;
        const p = wrap(flat);
        show(card, p.hidden);
        if (p.hidden) return;
        card.style.transform = `translate3d(${(p.x - flat).toFixed(1)}px, 0, ${p.z.toFixed(1)}px) rotateY(${(-p.angle).toFixed(4)}rad)`;
      });
    };

    measure();
    draw();
    const resize = new ResizeObserver(() => {
      measure();
      draw();
    });
    resize.observe(reel);
    document.fonts.ready.then(() => {
      measure();
      draw();
    });

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced)
      return () => {
        resize.disconnect();
        window.removeEventListener('scroll', onScroll);
      };

    // Redraw every frame while on screen: the eased scroll and the card slide both move things.
    let visible = true;
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    seen.observe(reel);
    const tick = () => visible && draw();
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      seen.disconnect();
      resize.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className="work-wall" ref={rootRef} aria-hidden="true">
      {LETTERS.map((letter) => (
        <div className="work-wall__row" key={letter}>
          {Array.from({ length: PER_ROW }, (_, i) => (
            <span key={i}>{letter}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
