import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const BLUR_FRAGMENT = fragmentShaderSource(
  `
  uniform vec2 u_direction;
  uniform float u_radius;
  uniform float u_kernel[21];
  `,
  `
  float radius = clamp(u_radius, 0.0, 20.0);
  vec2 stepUv = u_direction * u_texelSize;
  vec4 color = sampleLinear(v_uv) * u_kernel[0];
  for (int i = 1; i <= 20; i++) {
    float fi = float(i);
    float enabled = step(fi - 0.5, radius);
    vec2 offset = stepUv * fi;
    vec4 a = sampleLinear(v_uv + offset);
    vec4 b = sampleLinear(v_uv - offset);
    color += (a + b) * (u_kernel[i] * enabled);
  }
  gl_FragColor = color;
`,
);

function gaussianKernel(radius) {
  const r = Math.max(0, Math.min(20, Math.round(radius)));
  // Sigma heuristic: radius ~ 3 sigma
  const sigma = Math.max(0.001, r / 3);
  const twoSigma2 = 2 * sigma * sigma;
  const weights = new Float32Array(21);
  let sum = 0;
  for (let i = 0; i <= 20; i++) {
    if (i > r) {
      weights[i] = 0;
      continue;
    }
    const w = Math.exp(-(i * i) / twoSigma2);
    weights[i] = w;
    sum += i === 0 ? w : 2 * w;
  }
  if (sum > 0) {
    for (let i = 0; i <= 20; i++) weights[i] /= sum;
  }
  return weights;
}

export default defineGpuEffect({
  id: "blur",
  name: "Blur",
  icon: "bi-droplet",
  description: "Softens the image using a blur filter.",
  params: [
    { key: "radius", label: "Radius", type: "range", min: 0, max: 20, step: 0.5, unit: "px" },
  ],
  defaultParams: { radius: 0 },
  gl: {
    isNeutral(params) {
      const radius = Number(params.radius ?? 0);
      return !Number.isFinite(radius) || radius <= 0;
    },
    passes(params) {
      const radius = Number(params.radius ?? 0);
      if (!Number.isFinite(radius) || radius <= 0) return [];
      const r = Math.max(0, Math.min(20, radius));
      const kernel = gaussianKernel(r);
      return [
        pass(BLUR_FRAGMENT, { u_direction: [1, 0], u_radius: r, u_kernel: kernel }),
        pass(BLUR_FRAGMENT, { u_direction: [0, 1], u_radius: r, u_kernel: kernel }),
      ];
    },
  },
  getFilter(params) {
    const radius = Number(params.radius ?? 0);
    if (!Number.isFinite(radius) || radius <= 0) return null;
    return `blur(${radius}px)`;
  },
});
