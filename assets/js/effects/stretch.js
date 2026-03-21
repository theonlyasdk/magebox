import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const STRETCH_FRAGMENT = fragmentShaderSource(
  `
  uniform float u_amount;
  uniform float u_angle;
  uniform vec2 u_center;
  `,
  `
  vec2 aspect = vec2(u_outputSize.x / u_outputSize.y, 1.0);
  vec2 dir = vec2(cos(u_angle), sin(u_angle));
  
  // Transform to local space relative to center
  vec2 uv = v_uv - u_center;
  uv *= aspect;
  
  // Project onto the stretch direction
  float distParallel = dot(uv, dir);
  vec2 vParallel = distParallel * dir;
  vec2 vPerp = uv - vParallel;
  
  // Stretch along the parallel axis
  // amount > 1 stretches, amount < 1 compresses
  vec2 uvNew = vPerp + (vParallel / max(0.01, u_amount));
  
  // Transform back to global UV space
  uvNew /= aspect;
  uvNew += u_center;
  
  // Sample with clamping to avoid edge bleeding
  gl_FragColor = sampleLinear(uvNew);
`,
);

export default defineGpuEffect({
  id: "stretch",
  name: "Directional Stretch",
  icon: "bi-arrows-expand",
  description: "Stretches the image along a specific direction.",
  params: [
    { key: "amount", label: "Amount", type: "range", min: 0.1, max: 10, step: 0.05 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 360, step: 1, unit: "°" },
    { key: "centerX", label: "Center X", type: "range", min: 0, max: 1, step: 0.01, interactive: true },
    { key: "centerY", label: "Center Y", type: "range", min: 0, max: 1, step: 0.01, interactive: true },
  ],
  defaultParams: { amount: 2.0, angle: 0, centerX: 0.5, centerY: 0.5 },
  gl: {
    isNeutral(params) {
      return Number(params.amount ?? 1) === 1;
    },
    passes(params) {
      const amount = Number(params.amount ?? 1.0);
      if (amount === 1.0) return [];
      
      return [
        pass(STRETCH_FRAGMENT, {
          u_amount: amount,
          u_angle: (Number(params.angle ?? 0) * Math.PI) / 180,
          u_center: [Number(params.centerX ?? 0.5), Number(params.centerY ?? 0.5)],
        }),
      ];
    },
  },
});
