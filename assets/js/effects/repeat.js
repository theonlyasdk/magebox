import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const REPEAT_FRAGMENT = fragmentShaderSource(
  "uniform float u_scale; uniform vec2 u_offset;",
  `
  vec2 pixel = floor(v_uv * u_outputSize / max(u_scale, 0.0001)) - u_offset;
  vec2 wrapped = mod(mod(pixel, u_inputSize) + u_inputSize, u_inputSize);
  vec2 uv = (wrapped + 0.5) / u_inputSize;
  gl_FragColor = sampleNearest(uv);
`,
);

export default defineGpuEffect({
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
  gl: {
    isNeutral(params) {
      const scale = Number(params.scale ?? 1);
      const ox = Number(params.offsetX ?? 0);
      const oy = Number(params.offsetY ?? 0);
      return scale === 1 && ox === 0 && oy === 0;
    },
    passes(params) {
      const scale = Math.min(20, Math.max(0.05, Number(params.scale ?? 1)));
      const ox = Math.round(Number(params.offsetX ?? 0));
      const oy = Math.round(Number(params.offsetY ?? 0));
      if (scale === 1 && ox === 0 && oy === 0) return [];
      return [pass(REPEAT_FRAGMENT, { u_scale: scale, u_offset: [ox, oy] }, { filter: "nearest" })];
    },
  },
});
