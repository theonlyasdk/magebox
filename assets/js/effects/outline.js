function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export default {
  id: "outline",
  name: "Outline",
  icon: "bi-bounding-box",
  description: "Detects edges and draws an outline on top of the image.",
  controls: [
    { key: "strength", label: "Strength", type: "range", min: 0, max: 100, step: 1, unit: "%" },
    { key: "threshold", label: "Threshold", type: "range", min: 0, max: 255, step: 1 },
    { key: "invert", label: "Invert", type: "range", min: 0, max: 1, step: 1 },
  ],
  defaultParams: { strength: 70, threshold: 40, invert: 0 },
  applyImageData(imageData, width, height, params) {
    const strength = clamp(Number(params.strength ?? 0) / 100, 0, 1);
    if (strength <= 0) return imageData;
    const threshold = clamp(Number(params.threshold ?? 40), 0, 255);
    const invert = Number(params.invert ?? 0) === 1;

    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;
    const idx = (x, y) => (y * width + x) * 4;

    const lumAt = (x, y) => {
      const i = idx(x, y);
      // Rec. 601 luma
      return 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    };

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const gx =
          -1 * lumAt(x - 1, y - 1) +
          1 * lumAt(x + 1, y - 1) +
          -2 * lumAt(x - 1, y) +
          2 * lumAt(x + 1, y) +
          -1 * lumAt(x - 1, y + 1) +
          1 * lumAt(x + 1, y + 1);
        const gy =
          -1 * lumAt(x - 1, y - 1) +
          -2 * lumAt(x, y - 1) +
          -1 * lumAt(x + 1, y - 1) +
          1 * lumAt(x - 1, y + 1) +
          2 * lumAt(x, y + 1) +
          1 * lumAt(x + 1, y + 1);
        const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy));
        const edge = mag >= threshold ? 1 : 0;
        const edgeVal = invert ? 255 - edge * 255 : edge * 255;

        const i = idx(x, y);
        // Blend outline over original (black for normal, white when inverted)
        const o = edgeVal;
        dst[i] = clamp(src[i] * (1 - strength) + o * strength, 0, 255);
        dst[i + 1] = clamp(src[i + 1] * (1 - strength) + o * strength, 0, 255);
        dst[i + 2] = clamp(src[i + 2] * (1 - strength) + o * strength, 0, 255);
      }
    }
    return imageData;
  },
};

