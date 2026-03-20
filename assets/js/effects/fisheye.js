function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function bilinearSample(src, width, height, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, Math.max(0, x0 + 1));
  const y1 = Math.min(height - 1, Math.max(0, y0 + 1));
  const xa = Math.min(width - 1, Math.max(0, x0));
  const ya = Math.min(height - 1, Math.max(0, y0));

  const tx = x - x0;
  const ty = y - y0;

  const i00 = (ya * width + xa) * 4;
  const i10 = (ya * width + x1) * 4;
  const i01 = (y1 * width + xa) * 4;
  const i11 = (y1 * width + x1) * 4;

  const out = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const top = src[i00 + c] + (src[i10 + c] - src[i00 + c]) * tx;
    const bot = src[i01 + c] + (src[i11 + c] - src[i01 + c]) * tx;
    out[c] = top + (bot - top) * ty;
  }
  return out;
}

export default {
  id: "fisheye",
  name: "Fisheye",
  icon: "bi-eye",
  description: "Applies a fisheye lens distortion.",
  controls: [
    { key: "strength", label: "Strength", type: "range", min: -1, max: 1, step: 0.05 },
    { key: "radius", label: "Radius", type: "range", min: 10, max: 200, step: 1, unit: "%" },
  ],
  defaultParams: { strength: 0.5, radius: 100 },
  applyImageData(imageData, width, height, params) {
    const k = clamp(Number(params.strength ?? 0.5), -1, 1);
    if (k === 0) return imageData;
    const radiusPct = clamp(Number(params.radius ?? 100), 10, 200) / 100;

    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;

    const cx = (width - 1) / 2;
    const cy = (height - 1) / 2;
    const maxR = Math.min(cx, cy) * radiusPct;

    for (let y = 0; y < height; y++) {
      const dy = y - cy;
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const r = Math.sqrt(dx * dx + dy * dy);
        const di = (y * width + x) * 4;
        if (r > maxR) {
          const si = di;
          dst[di] = src[si];
          dst[di + 1] = src[si + 1];
          dst[di + 2] = src[si + 2];
          dst[di + 3] = src[si + 3];
          continue;
        }

        const rn = r / maxR;
        // Inverse mapping for a simple barrel/pincushion style effect.
        const factor = rn === 0 ? 1 : Math.pow(rn, 1 + k);
        const srcR = factor * maxR;
        const scale = r === 0 ? 1 : srcR / r;
        const sx = clamp(cx + dx * scale, 0, width - 1);
        const sy = clamp(cy + dy * scale, 0, height - 1);

        const [rr, gg, bb, aa] = bilinearSample(src, width, height, sx, sy);
        dst[di] = rr;
        dst[di + 1] = gg;
        dst[di + 2] = bb;
        dst[di + 3] = aa;
      }
    }

    return imageData;
  },
};

