import { useLayoutEffect, useRef, useState } from 'react';
import './Journey.css';

/*
 * The journey: a fine line winds across the top of the screen as you scroll, with a marker for each milestone.
 * When the line reaches a marker, that milestone's chapter (a big year, a title and a line or two) takes over the
 * lower half of the screen. That scroll animation lives in Home, with the page's other scroll effects.
 *
 * The route is designed in a fixed box and scaled to the line area's real pixel size, so the SVG is never stretched:
 * the stroke keeps an even width and GSAP's line drawing measures it exactly.
 */

const BOX = [1000, 400];
const ROUTE =
  'M -20 300 C 120 300, 170 110, 300 120 S 440 320, 555 250 C 640 200, 660 90, 600 80 C 530 70, 540 230, 660 250 S 880 140, 1020 180';
// Roughly where each milestone's marker sits (the nearest point on the route is used).
const SPOTS = [
  [140, 206],
  [300, 120],
  [555, 250],
  [600, 80],
  [800, 205],
  [960, 175],
];

// Every coordinate in the route is an "x y" pair; scale each pair to the line area.
const scalePath = (d, sx, sy) =>
  d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${(x * sx).toFixed(1)} ${(y * sy).toFixed(1)}`);

const pad = (n) => String(n).padStart(2, '0');

export default function Journey({ items }) {
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const [size, setSize] = useState(null); // the line area's real size in px
  const [points, setPoints] = useState([]);

  // Track the line area's size.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const measure = () => setSize({ w: svg.clientWidth, h: svg.clientHeight });
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(svg);
    return () => watch.disconnect();
  }, []);

  const scaled = size ? scalePath(ROUTE, size.w / BOX[0], size.h / BOX[1]) : '';

  // Find where along the route each marker sits.
  useLayoutEffect(() => {
    if (!size) return;
    const path = pathRef.current;
    const length = path.getTotalLength();
    const nearest = (x, y) => {
      let best = 0;
      for (let s = 0, gap = Infinity; s <= 600; s++) {
        const q = path.getPointAtLength((s / 600) * length);
        const g = Math.hypot(q.x - x, q.y - y);
        if (g < gap) [gap, best] = [g, s / 600];
      }
      return best;
    };
    setPoints(
      items.map((_, i) => {
        const [sx, sy] = SPOTS[i % SPOTS.length]; // shortcut: six spots; add more if the story grows past six
        const at = nearest((sx * size.w) / BOX[0], (sy * size.h) / BOX[1]);
        const p = path.getPointAtLength(at * length);
        return { at, x: (p.x / size.w) * 100, y: (p.y / size.h) * 100 };
      }),
    );
  }, [items, size, scaled]);

  return (
    <div className="journey__stage">
      <div className="journey__map">
        <svg
          className="journey__line"
          ref={svgRef}
          viewBox={size ? `0 0 ${size.w} ${size.h}` : undefined}
          aria-hidden="true"
        >
          <path className="journey__draw" d={scaled} ref={pathRef} />
          <circle className="journey__tip" r="5.5" />
        </svg>
        <ol className="journey__marks" aria-hidden="true">
          {items.map((item, i) => {
            const p = points[i];
            return (
              <li
                className="journey__mark"
                key={item.title}
                data-at={p?.at}
                style={p ? { left: `${p.x}%`, top: `${p.y}%` } : { visibility: 'hidden' }}
              >
                <span className="journey__dot">
                  <span className="journey__fill" />
                </span>
                <span className="journey__label">{item.year}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <ol className="journey__chapters">
        {items.map((item, i) => (
          <li className="journey__chapter" key={item.title}>
            <span className="journey__year-mask">
              <span className="journey__year">{item.year}</span>
            </span>
            <div className="journey__body">
              <span className="journey__count">
                {pad(i + 1)} / {pad(items.length)}
              </span>
              <h3 className="journey__title">{item.title}</h3>
              <p className="journey__text">{item.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
