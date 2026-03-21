import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const CHROMATIC_FRAGMENT = fragmentShaderSource(
  `
  uniform float u_amount;
  uniform float u_angle;
  uniform bool u_radial;
  `,
  `
  vec2 uv = v_uv;
  vec3 result;
  
  // Calculate offset direction
  vec2 dir;
  if (u_radial) {
    // Radial: offset points away from the center
    dir = uv - 0.5;
  } else {
    // Linear: offset follows a fixed angle
    dir = vec2(cos(u_angle), sin(u_angle));
  }

  // Base offset scaled by amount and texel size
  vec2 offset = dir * u_amount * 0.02;

  // Sample channels with different offsets
  // Red shifted one way, Blue the other, Green stays in center
  float r = sampleLinear(uv + offset).r;
  float g = sampleLinear(uv).g;
  float b = sampleLinear(uv - offset).b;
  
  gl_FragColor = vec4(r, g, b, sampleLinear(uv).a);
`,
);

export default defineGpuEffect({
  id: "chromatic-aberration",
  name: "Chromatic Aberration",
  icon: "bi-gpu-card",
  description: "Simulates lens color fringing by separating RGB channels.",
  params: [
    {
      key: "radial",
      label: "Radial Mode",
      type: "switch",
      description: "Increase distortion towards edges"
    },
    { key: "amount", label: "Amount", type: "range", min: 0, max: 5, step: 0.05 },
    { 
      key: "angle", 
      label: "Angle", 
      type: "range", 
      min: 0, 
      max: 360, 
      step: 1, 
      unit: "°",
      show_on: { key: "radial", value: false }
    },
  ],
  defaultParams: { amount: 1.0, angle: 0, radial: true },
  gl: {
    isNeutral(params) {
      return Number(params.amount ?? 0) <= 0;
    },
    passes(params) {
      const amount = Number(params.amount ?? 1.0);
      if (amount <= 0) return [];
      
      return [
        pass(CHROMATIC_FRAGMENT, {
          u_amount: amount,
          u_angle: (Number(params.angle ?? 0) * Math.PI) / 180,
          u_radial: Boolean(params.radial),
        }),
      ];
    },
  },
});
