import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const GRAYSCALE_FRAGMENT = fragmentShaderSource(
  "uniform float u_amount;",
  `
  vec4 color = sampleLinear(v_uv);
  float gray = luminance(color.rgb);
  gl_FragColor = vec4(mix(color.rgb, vec3(gray), u_amount), color.a);
`,
);

export default defineGpuEffect({
  id: "grayscale",
  name: "Grayscale",
  icon: "bi-droplet-half",
  description: "Converts colors to grayscale.",
  params: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 100, step: 1, unit: "%" },
  ],
  defaultParams: { amount: 100 },
  gl: {
    isNeutral(params) {
      return Number(params.amount ?? 0) <= 0;
    },
    passes(params) {
      const amount = Number(params.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) return [];
      return [pass(GRAYSCALE_FRAGMENT, { u_amount: Math.min(1, amount / 100) })];
    },
  },
  getFilter(params) {
    const amount = Number(params.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return `grayscale(${amount}%)`;
  },
});
