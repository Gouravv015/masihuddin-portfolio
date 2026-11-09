import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import TiltedCard from './TiltedCard.jsx';

const SLICES = 32;
// How far the bottom rows lead the top ones: this lag is what bends the card into a funnel.
const LAG = 0.8;
const OPEN_SECONDS = 0.6;
const CLOSE_SECONDS = 0.5;
// TiltedCard draws its image this much past each edge for parallax (see `bleed` there, at its default props).
const BLEED = 6;
const RADIUS = 15;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Tilted song card that opens from and closes into `anchorRef`, inspired by the macOS Genie effect.
 * While moving it is drawn as horizontal strips of the image; at rest it is the real TiltedCard.
 */
export default function SongCard({ open, anchorRef, imageSrc, title, artist, children }) {
  const cardRef = useRef(null);
  const slicesRef = useRef(null);
  const progress = useRef({ closed: 1 }); // 0 = fully open, 1 = inside the anchor
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true);

  useLayoutEffect(() => {
    if (!rendered) return undefined;
    const card = cardRef.current;
    const strip = slicesRef.current;
    const slices = [...strip.children];
    const rect = card.getBoundingClientRect();
    const anchor = anchorRef.current.getBoundingClientRect();
    const anchorX = anchor.left + anchor.width / 2;
    const anchorY = anchor.top + anchor.height / 2;
    const sliceHeight = rect.height / SLICES;

    slices.forEach((el, i) => {
      el.style.width = `${rect.width}px`;
      el.style.height = `${sliceHeight}px`;
      el.style.backgroundSize = `${rect.width + BLEED * 2}px ${rect.height + BLEED * 2}px`;
      el.style.backgroundPosition = `${-BLEED}px ${-BLEED - i * sliceHeight}px`;
    });

    const rowProgress = (v) => clamp01(progress.current.closed * (1 + LAG) - LAG * (1 - v));
    const rowY = (v) => lerp(rect.top + rect.height * v, anchorY, smooth(rowProgress(v)));

    const draw = () => {
      const { closed } = progress.current;
      const atRest = closed === 0;
      card.style.visibility = atRest ? 'visible' : 'hidden';
      card.classList.toggle('song-card--landed', atRest);
      strip.style.display = atRest ? 'none' : 'block';
      if (atRest) return;

      // The last stretch fades, so the strips melt into the button instead of popping out.
      strip.style.opacity = clamp01((1 - closed) / 0.12);
      slices.forEach((el, i) => {
        const v = i / SLICES;
        const y = rowY(v);
        const height = Math.max(rowY((i + 1) / SLICES) - y, 0) + 0.5; // 0.5 hides hairline gaps between strips.
        // Width collapses ahead of position, which pinches the card's neck toward the button.
        const pinch = smooth(clamp01(rowProgress(v + 0.5 / SLICES) * 1.7));
        const width = lerp(rect.width, anchor.width * 0.5, pinch);
        const x = lerp(rect.left + rect.width / 2, anchorX, pinch) - width / 2;
        el.style.transform = `translate(${x}px, ${y}px) scale(${width / rect.width}, ${height / sliceHeight})`;
      });
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tween = gsap.to(progress.current, {
      closed: open ? 0 : 1,
      duration: reduced ? 0 : open ? OPEN_SECONDS : CLOSE_SECONDS,
      ease: open ? 'power2.out' : 'power2.in',
      onUpdate: draw,
      onComplete: () => {
        draw();
        if (!open) setRendered(false);
      },
    });
    draw();
    return () => tween.kill();
  }, [open, rendered, anchorRef]);

  if (!rendered) return null;

  return (
    <>
      <div className="song-card" ref={cardRef} style={{ visibility: 'hidden' }}>
        <TiltedCard
          imageSrc={imageSrc}
          altText={`${title} by ${artist}`}
          containerWidth="100%"
          containerHeight="100%"
          imageWidth="100%"
          imageHeight="100%"
          radius={RADIUS}
          overlayContent={children}
          displayOverlayContent
          intro={false}
          gyroscope={false}
        />
      </div>
      <div className="song-card__slices" ref={slicesRef} aria-hidden="true">
        {Array.from({ length: SLICES }, (_, i) => (
          <div
            key={i}
            className="song-card__slice"
            style={{
              backgroundImage: `url("${imageSrc}")`,
              borderRadius:
                i === 0 ? `${RADIUS}px ${RADIUS}px 0 0` : i === SLICES - 1 ? `0 0 ${RADIUS}px ${RADIUS}px` : undefined,
            }}
          />
        ))}
      </div>
    </>
  );
}
