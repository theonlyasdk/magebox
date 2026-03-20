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
  id: "warp",
  name: "Warp",
  icon: "bi-arrow-repeat",
  description: "Waves the image using sine-based warping.",
  controls: [
    { key: "amplitude", label: "Amplitude", type: "range", min: 0, max: 100, step: 1, unit: "px" },
    { key: "frequency", label: "Frequency", type: "range", min: 0.1, max: 10, step: 0.1 },
    {
      key: "axis",
      label: "Axis",
      type: "select",
      options: [
        { label: "Horizontal", value: "x" },
        { label: "Vertical", value: "y" },
      ],
    },
  ],
  defaultParams: { amplitude: 20, frequency: 2, axis: "x" },
  applyImageData(imageData, width, height, params) {
    const amp = clamp(Number(params.amplitude ?? 0), 0, 200);
    const freq = clamp(Number(params.frequency ?? 2), 0.1, 20);
    const axis = params.axis === "y" ? "y" : "x";
    if (amp <= 0) return imageData;

    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sx = x;
        let sy = y;
        if (axis === "x") {
          sx = x + Math.sin((y / height) * Math.PI * 2 * freq) * amp;
        } else {
          sy = y + Math.sin((x / width) * Math.PI * 2 * freq) * amp;
        }

        sx = clamp(sx, 0, width - 1);
        sy = clamp(sy, 0, height - 1);

        const [r, g, b, a] = bilinearSample(src, width, height, sx, sy);
        const di = (y * width + x) * 4;
        dst[di] = r;
        dst[di + 1] = g;
        dst[di + 2] = b;
        dst[di + 3] = a;
      }
    }
    return imageData;
  },
};
