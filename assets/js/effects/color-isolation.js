function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export default {
  id: "colorIsolation",
  name: "Color Isolation",
  icon: "bi-palette",
  description: "Keeps a selected color, makes everything else black & white.",
  controls: [
    { key: "color", label: "Target color", type: "color" },
    { key: "tolerance", label: "Tolerance", type: "range", min: 0, max: 180, step: 1, unit: "°" },
    { key: "softness", label: "Softness", type: "range", min: 0, max: 100, step: 1, unit: "%" },
  ],
  defaultParams: { color: "#ff0000", tolerance: 25, softness: 25 },
  applyImageData(imageData, width, height, params) {
    const hex = String(params.color ?? "#ff0000");
    const tol = clamp(Number(params.tolerance ?? 25), 0, 180);
    const soft = clamp(Number(params.softness ?? 25) / 100, 0, 1);

    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return imageData;
    const n = parseInt(m[1], 16);
    const tr = (n >> 16) & 255;
    const tg = (n >> 8) & 255;
    const tb = n & 255;
    const target = rgbToHsl(tr, tg, tb);

    const data = imageData.data;
    const softBand = tol * (0.5 + soft); // widen edge transition
    const t0 = Math.max(0, tol - softBand);
    const t1 = tol + softBand;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const { h } = rgbToHsl(r, g, b);
      const d = hueDistance(h, target.h);

      // keep factor k in [0..1]
      let k;
      if (d <= t0) k = 1;
      else if (d >= t1) k = 0;
      else k = 1 - (d - t0) / (t1 - t0);

      // grayscale value
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = gray * (1 - k) + r * k;
      data[i + 1] = gray * (1 - k) + g * k;
      data[i + 2] = gray * (1 - k) + b * k;
    }
    return imageData;
  },
};

