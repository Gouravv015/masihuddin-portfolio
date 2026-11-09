/** Custom question mark in a 320 x 468 unit space, with a true square dot. */
export const GLYPH = {
  width: 320,
  height: 468,
};

export const HOOK_PATH =
  'M10 150' +
  'A150 150 0 0 1 310 150' + // outer curve, over the top
  'C310 205 283 236 248 258' + // shoulder, turning back in
  'C218 277 202 292 202 322' + // into the right edge of the stem
  'L202 340H118V300' + // stem foot
  'C118 262 138 236 176 212' + // left edge of the stem, back up
  'C210 191 226 176 226 150' + // into the counter
  'A66 66 0 0 0 94 150' + // inner curve
  'Z';

export const DOT = {
  x: 112,
  y: 372,
  size: 96,
};

/** The point the zoom pushes into: the centre of the dot, as a CSS transform-origin. */
export const DOT_ORIGIN = `${((DOT.x + DOT.size / 2) / GLYPH.width) * 100}% ${((DOT.y + DOT.size / 2) / GLYPH.height) * 100}%`;
