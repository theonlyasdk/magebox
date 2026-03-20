import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const BRIGHTNESS_FRAGMENT = fragmentShaderSource(
  "uniform float u_factor;",
  `
  vec4 color = sampleLinear(v_uv);
  gl_FragColor = vec4(max(color.rgb * u_factor, 0.0), color.a);
`,
);

export default defineGpuEffect({
  id: "brightness",
  name: "Brightness",
  icon: "bi-sun",
  description: "Adjusts exposure/brightness.",
  controls: [
    { key: "amount", label: "Amount", type: "range", min: -100, max: 100, step: 1, unit: "%" },
  ],
  defaultParams: { amount: 0 },
  gl: {
    isNeutral(params) {
      return Number(params.amount ?? 0) === 0;
    },
    passes(params) {
      const amount = Number(params.amount ?? 0);
      if (!Number.isFinite(amount) || amount === 0) return [];
      return [pass(BRIGHTNESS_FRAGMENT, { u_factor: Math.max(0, 1 + amount / 100) })];
    },
  },
  getFilter(params) {
    const amount = Number(params.amount ?? 0);
    if (!Number.isFinite(amount) || amount === 0) return null;
    const percent = Math.max(0, 100 + amount);
    return `brightness(${percent}%)`;
  },
});
