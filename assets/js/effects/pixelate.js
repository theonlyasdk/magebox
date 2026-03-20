import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const PIXELATE_FRAGMENT = fragmentShaderSource(
  "uniform float u_size;",
  `
  vec2 size = max(vec2(1.0), vec2(u_size));
  vec2 uv = (floor(v_uv * u_outputSize / size) * size + size * 0.5) / u_outputSize;
  gl_FragColor = sampleNearest(uv);
`,
);

export default defineGpuEffect({
  id: "pixelate",
  name: "Pixelate",
  icon: "bi-grid-3x3",
  description: "Reduces the image resolution for a blocky, pixelated look.",
  controls: [
    { key: "size", label: "Pixel Size", type: "range", min: 1, max: 100, step: 1, unit: "px" },
  ],
  defaultParams: { size: 8 },
  gl: {
    isNeutral(params) {
      return Number(params.size ?? 1) <= 1;
    },
    passes(params) {
      const size = Number(params.size ?? 8);
      if (size <= 1) return [];
      return [pass(PIXELATE_FRAGMENT, { u_size: size })];
    },
  },
});
