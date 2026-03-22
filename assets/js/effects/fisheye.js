import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const FISHEYE_FRAGMENT = fragmentShaderSource(
  `
  uniform float u_strength;
  uniform float u_radiusPct;
  `,
  `
  vec2 center = vec2(0.5);
  vec2 aspect = vec2(u_inputSize.x / min(u_inputSize.x, u_inputSize.y), u_inputSize.y / min(u_inputSize.x, u_inputSize.y));
  vec2 delta = (v_uv - center) * aspect;
  float maxR = 0.5 * u_radiusPct;
  float r = length(delta);
  if (r > maxR) {
    gl_FragColor = sampleLinear(v_uv);
    return;
  }
  float rn = r / max(maxR, 0.0001);
  float factor = rn <= 0.0 ? 1.0 : pow(rn, 1.0 + u_strength);
  float srcR = factor * maxR;
  float scale = r <= 0.0 ? 1.0 : srcR / r;
  vec2 sampleUv = center + (delta * scale) / aspect;
  gl_FragColor = sampleLinear(sampleUv);
`,
);

export default createGpuEffect({
  id: "fisheye",
  name: "Fisheye",
  icon: "bi-eye",
  description: "Applies a fisheye lens distortion.",
  params: [
    { key: "strength", label: "Strength", type: "range", min: -1, max: 1, step: 0.05 },
    { key: "radius", label: "Radius", type: "range", min: 10, max: 200, step: 1, unit: "%" },
  ],
  defaultParams: { strength: 0.5, radius: 100 },
  render: {
    isNeutral(params) {
      return Number(params.strength ?? 0) === 0;
    },
    passes(params) {
      const strength = Math.max(-1, Math.min(1, Number(params.strength ?? 0.5)));
      if (strength === 0) return [];
      return [
        pass(FISHEYE_FRAGMENT, {
          u_strength: strength,
          u_radiusPct: Math.max(0.1, Math.min(2, Number(params.radius ?? 100) / 100)),
        }),
      ];
    },
  },
});
