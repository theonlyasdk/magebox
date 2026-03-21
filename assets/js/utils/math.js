export function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Interpolates points using a monotonic cubic spline.
 * Points must be an array of [x, y] sorted by x.
 * Returns an array of 256 values representing the curve from x=0 to x=1.
 */
export function generateSplineLUT(points) {
  if (!points || points.length < 2) {
    return new Float32Array(256).fill(0).map((_, i) => i / 255);
  }

  const n = points.length;
  const x = points.map((p) => p[0]);
  const y = points.map((p) => p[1]);

  const dx = new Array(n - 1);
  const dy = new Array(n - 1);
  const ms = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    dx[i] = x[i + 1] - x[i];
    dy[i] = y[i + 1] - y[i];
    ms[i] = dy[i] / dx[i];
  }

  const c1s = new Array(n);
  c1s[0] = ms[0];
  for (let i = 1; i < n - 1; i++) {
    const m = ms[i - 1];
    const next = ms[i];
    if (m * next <= 0) {
      c1s[i] = 0;
    } else {
      const common_dx = dx[i - 1] + dx[i];
      c1s[i] = (3 * common_dx) / ((common_dx + dx[i]) / m + (common_dx + dx[i - 1]) / next);
    }
  }
  c1s[n - 1] = ms[n - 2];

  const c2s = new Array(n - 1);
  const c3s = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    const c1 = c1s[i];
    const m = ms[i];
    const invDx = 1 / dx[i];
    const common_ = c1 + c1s[i + 1] - 2 * m;
    c2s[i] = (m - c1 - common_) * invDx;
    c3s[i] = common_ * invDx * invDx;
  }

  const lut = new Float32Array(256);
  for (let j = 0; j < 256; j++) {
    const tx = j / 255;
    if (tx <= x[0]) {
      lut[j] = clampNumber(y[0], 0, 1);
      continue;
    }
    if (tx >= x[n - 1]) {
      lut[j] = clampNumber(y[n - 1], 0, 1);
      continue;
    }

    let i = 0;
    while (tx > x[i + 1]) i++;

    const x_diff = tx - x[i];
    const val = y[i] + c1s[i] * x_diff + c2s[i] * x_diff * x_diff + c3s[i] * x_diff * x_diff * x_diff;
    lut[j] = clampNumber(val, 0, 1);
  }

  return lut;
}

