// Scroll-driven dissolve on a <canvas>: a black-and-white photo burns away from the centre outward, with a ragged
// edge, glowing outlines and sparkles, revealing the same photo in colour underneath. The look follows Vengeance
// UI's Scroll Dissolve Reveal (https://www.vengenceui.com/components/scroll-dissolve-reveal), rewritten as plain
// WebGL so it doesn't need Three.js. It draws only when `render()` is called: no animation loop.

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float; // mediump bands the noise into visible rings
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uImageResolution;
uniform float uDissolve;
uniform vec2 uExtent; // the visible part of the canvas (the frame clips it), as a fraction of each side
varying vec2 vUv;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
float sobel(vec2 uv, vec2 texel) {
  float tl = luma(texture2D(uTexture, uv + texel * vec2(-1.0, 1.0)).rgb);
  float t  = luma(texture2D(uTexture, uv + texel * vec2(0.0, 1.0)).rgb);
  float tr = luma(texture2D(uTexture, uv + texel * vec2(1.0, 1.0)).rgb);
  float l  = luma(texture2D(uTexture, uv + texel * vec2(-1.0, 0.0)).rgb);
  float r  = luma(texture2D(uTexture, uv + texel * vec2(1.0, 0.0)).rgb);
  float bl = luma(texture2D(uTexture, uv + texel * vec2(-1.0, -1.0)).rgb);
  float b  = luma(texture2D(uTexture, uv + texel * vec2(0.0, -1.0)).rgb);
  float br = luma(texture2D(uTexture, uv + texel * vec2(1.0, -1.0)).rgb);
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -bl - 2.0 * b - br + tl + 2.0 * t + tr;
  return sqrt(gx * gx + gy * gy);
}

void main() {
  // Cover-fit the photo to the canvas.
  vec2 ratio = vec2(
    min((uResolution.x / uResolution.y) / (uImageResolution.x / uImageResolution.y), 1.0),
    min((uResolution.y / uResolution.x) / (uImageResolution.y / uImageResolution.x), 1.0)
  );
  vec2 uv = vec2(vUv.x * ratio.x + (1.0 - ratio.x) * 0.5, (1.0 - vUv.y) * ratio.y + (1.0 - ratio.y) * 0.5);
  vec3 colour = texture2D(uTexture, uv).rgb;
  vec3 mono = vec3(luma(colour));

  // Distance from the centre of the visible frame, roughened with blocky and angular noise for a ragged edge.
  float aspect = (uResolution.x * uExtent.x) / (uResolution.y * uExtent.y);
  vec2 c = (vUv - 0.5) / uExtent;
  c.x *= aspect;
  float angle = atan(c.y, c.x);
  vec2 block = floor(vUv * uResolution / 5.0) * 5.0 / uResolution;
  float dist = (length(c) + fbm(block * 100.0) * 0.15 + fbm(vec2(angle * 5.0, 0.0)) * 0.15) / length(vec2(aspect * 0.5, 0.5));

  float threshold = uDissolve * 1.5;
  float keep = smoothstep(threshold - 0.03, threshold, dist); // 1: still black and white, 0: burnt through

  // Only real outlines glow; faint gradients (like a smooth sky) stay clean.
  float edge = smoothstep(0.12, 0.5, sobel(uv, 1.0 / uResolution));
  vec3 glow = vec3(1.0, 0.56, 0.36); // warm, toward the site orange

  // Front: the black-and-white photo, its outlines starting to glow as it goes.
  vec3 front = mono + glow * edge * uDissolve * (1.0 - uDissolve) * 2.0;
  // Back: the colour photo, a touch dim with glowing outlines at first, settling to plain colour.
  vec3 back = colour * (0.7 + 0.3 * uDissolve) + glow * edge * 0.35 * (1.0 - uDissolve);

  // The burning edge: a wide band of sparkles, a soft glow halo around it and a white-hot rim right at the line.
  float fade = 1.0 - uDissolve * 0.6; // stays bright until late
  float zone = 0.22 * (1.0 - uDissolve) + 0.04; // how far behind the line the sparkles reach
  float band = smoothstep(threshold - zone, threshold - zone + 0.05, dist) * smoothstep(threshold + 0.03, threshold - 0.02, dist);
  float grain = hash(floor(vUv * uResolution / 3.0));
  vec3 sparks = glow * pow(grain, 2.0) * band * 4.0 * fade; // fewer, brighter specks
  sparks += vec3(1.0, 0.95, 0.85) * step(0.93, grain) * band * 1.8 * fade; // the odd white glint
  float halo = exp(-abs(dist - threshold) * 22.0); // soft light spilling onto both sides of the line
  vec3 bloom = glow * halo * 0.5 * fade;
  vec3 rim = vec3(1.0, 0.9, 0.75) * exp(-abs(dist - threshold) * 70.0) * 0.9 * fade; // white-hot core of the edge

  gl_FragColor = vec4(mix(back, front, keep) + sparks + bloom + rim, 1.0);
}`;

/** Sets up the dissolve on `canvas` with the image at `src`. Returns null if WebGL isn't available. */
export function createDissolve(canvas, src) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return null;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram();
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (name) => gl.getUniformLocation(program, name);
  const uniforms = {
    resolution: u('uResolution'),
    image: u('uImageResolution'),
    dissolve: u('uDissolve'),
    extent: u('uExtent'),
  };

  const texture = gl.createTexture();
  let ready = false;
  let progress = 0;
  let extent = [1, 1];
  const image = new Image();
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform2f(uniforms.image, image.naturalWidth, image.naturalHeight);
    ready = true;
    draw();
  };
  image.src = src;

  function draw() {
    if (!ready || gl.isContextLost()) return;
    gl.uniform1f(uniforms.dissolve, progress);
    gl.uniform2f(uniforms.extent, extent[0], extent[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // capped: the effect doesn't need retina pixels
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    draw();
  };
  resize();

  return {
    /** `next`: 0 (black and white) to 1 (all colour). `visible`: [x, y] fraction of the canvas the frame shows. */
    render(next, visible = [1, 1]) {
      if (next === progress && visible[0] === extent[0] && visible[1] === extent[1]) return;
      progress = next;
      extent = visible;
      draw();
    },
    resize,
    destroy() {
      image.onload = null;
      gl.deleteTexture(texture);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
