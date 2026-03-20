function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export default {
  id: "greenScreen",
  name: "Green Screen",
  icon: "bi-person-bounding-box",
  description: "Keys out a chosen color and makes it transparent (chroma key).",
  controls: [
    { key: "color", label: "Key color", type: "color" },
    { key: "tolerance", label: "Tolerance", type: "range", min: 0, max: 180, step: 1, unit: "°" },
    { key: "softness", label: "Softness", type: "range", min: 0, max: 100, step: 1, unit: "%" },
  ],
  defaultParams: { color: "#00ff00", tolerance: 35, softness: 30 },
  applyImageData(imageData, width, height, params) {
    const hex = String(params.color ?? "#00ff00");
    const tol = clamp(Number(params.tolerance ?? 35), 0, 180);
    const soft = clamp(Number(params.softness ?? 30) / 100, 0, 1);

    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return imageData;
    const n = parseInt(m[1], 16);
    const kr = (n >> 16) & 255;
    const kg = (n >> 8) & 255;
    const kb = n & 255;
    const key = rgbToHsv(kr, kg, kb);

    const data = imageData.data;
    const softBand = tol * (0.5 + soft);
    const t0 = Math.max(0, tol - softBand);
    const t1 = tol + softBand;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a === 0) continue;

      const hsv = rgbToHsv(r, g, b);
      const d = hueDistance(hsv.h, key.h);

      // key factor k in [0..1]
      let k;
      if (d <= t0) k = 1;
      else if (d >= t1) k = 0;
      else k = 1 - (d - t0) / (t1 - t0);

      const alpha = clamp(a * (1 - k), 0, 255);
      data[i + 3] = alpha;
    }
    return imageData;
  },
};
