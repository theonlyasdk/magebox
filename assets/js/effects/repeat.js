function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export default {
  id: "repeat",
  name: "Repeat",
  icon: "bi-grid-3x3-gap",
  description: "Repeats (tiles) the image by wrapping pixels with an offset.",
  controls: [
    {
      key: "scale",
      label: "Scale",
      type: "range",
      min: -1.3,
      max: 0.6,
      step: 0.01,
      unit: "×",
      transform: { type: "exp", base: 10, paramMin: 0.05, paramMax: 4 },
    },
    { key: "offsetX", label: "Offset X", type: "range", min: -1000, max: 1000, step: 1, unit: "px" },
    { key: "offsetY", label: "Offset Y", type: "range", min: -1000, max: 1000, step: 1, unit: "px" },
  ],
  defaultParams: { scale: 1, offsetX: 0, offsetY: 0 },
  applyImageData(imageData, width, height, params) {
    const scale = clamp(Number(params.scale ?? 1), 0.05, 20);
    const ox = Math.round(clamp(Number(params.offsetX ?? 0), -10000, 10000));
    const oy = Math.round(clamp(Number(params.offsetY ?? 0), -10000, 10000));
    if (scale === 1 && ox === 0 && oy === 0) return imageData;

    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;

    const mod = (n, m) => ((n % m) + m) % m;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sx = mod(Math.floor(x / scale) - ox, width);
        const sy = mod(Math.floor(y / scale) - oy, height);
        const si = (sy * width + sx) * 4;
        const di = (y * width + x) * 4;
        dst[di] = src[si];
        dst[di + 1] = src[si + 1];
        dst[di + 2] = src[si + 2];
        dst[di + 3] = src[si + 3];
      }
    }
    return imageData;
  },
};
