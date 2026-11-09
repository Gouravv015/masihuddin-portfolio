// Flip text, after Vengeance UI's Flip Text (https://www.vengenceui.com/components/flip-text): each letter is a
// tiny 3D cube that tips forward to its next face, letters following each other in a wave. Local change: instead of
// looping forever it plays once each time its button or link is hovered or keyboard-focused (see FlipText.css).
import './FlipText.css';

const DURATION = 0.6; // seconds per letter
const WAVE = 0.22; // seconds from the first letter starting to the last

export default function FlipText({ children, className = '' }) {
  const text = String(children);
  const chars = [...text];
  return (
    <span className={`flip-text ${className}`.trim()}>
      <span className="flip-text__sr">{text}</span>
      <span className="flip-text__chars" aria-hidden="true">
        {chars.map((char, i) =>
          char === ' ' ? (
            <span className="flip-text__space" key={i}>
              {' '}
            </span>
          ) : (
            <span
              className="flip-char"
              data-char={char}
              key={i}
              style={{
                '--flip-duration': `${DURATION}s`,
                // Eased wave: quick at the start, slowing toward the end, as in the original.
                '--flip-delay': `${Math.sin((i / chars.length) * (Math.PI / 2)) * WAVE}s`,
              }}
            >
              {char}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
