function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export default {
  id: "cartoon",
  name: "Cartoon",
  icon: "bi-magic",
  description: "Posterizes colors and adds edge lines for a cartoon look.",
  controls: [
    { key: "levels", label: "Color levels", type: "range", min: 2, max: 16, step: 1 },
    { key: "edges", label: "Edges", type: "range", min: 0, max: 100, step: 1, unit: "%" },
    { key: "threshold", label: "Edge threshold", type: "range", min: 0, max: 255, step: 1 },
  ],
  defaultParams: { levels: 6, edges: 60, threshold: 50 },
  applyImageData(imageData, width, height, params) {
    const levels = clamp(Number(params.levels ?? 6), 2, 32);
    const edgeStrength = clamp(Number(params.edges ?? 0) / 100, 0, 1);
    const threshold = clamp(Number(params.threshold ?? 50), 0, 255);

    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;
    const step = 255 / (levels - 1);
    const idx = (x, y) => (y * width + x) * 4;

    const lumAt = (x, y) => {
      const i = idx(x, y);
      return 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    };

    // Posterize colors
    for (let i = 0; i < dst.length; i += 4) {
      dst[i] = Math.round(src[i] / step) * step;
      dst[i + 1] = Math.round(src[i + 1] / step) * step;
      dst[i + 2] = Math.round(src[i + 2] / step) * step;
      dst[i + 3] = src[i + 3];
    }

    if (edgeStrength <= 0) return imageData;

    // Edge overlay (black lines)
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
        if (mag < threshold) continue;
        const t = edgeStrength * (mag / 255);
        const i = idx(x, y);
        dst[i] = clamp(dst[i] * (1 - t), 0, 255);
        dst[i + 1] = clamp(dst[i + 1] * (1 - t), 0, 255);
        dst[i + 2] = clamp(dst[i + 2] * (1 - t), 0, 255);
      }
    }

    return imageData;
  },
};

