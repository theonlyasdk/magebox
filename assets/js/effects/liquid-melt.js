import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const LIQUID_MELT_HEADER = `
  uniform float u_amount;
  uniform float u_scale;
  uniform float u_viscosity;
  uniform float u_gravity;
  uniform float u_turbulence;
  uniform float u_tension;
  uniform float u_seed;

  float hash1(vec2 p) {
    return fract(sin(dot(p + u_seed, vec2(127.1, 311.7))) * 43758.5453);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash1(i);
    float b = hash1(i + vec2(1.0, 0.0));
    float c = hash1(i + vec2(0.0, 1.0));
    float d = hash1(i + vec2(1.0, 1.0));

    float x1 = mix(a, b, f.x);
    float x2 = mix(c, d, f.x);
    return mix(x1, x2, f.y);
  }

  float fbm(vec2 p) {
    float total = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      total += amplitude * valueNoise(p);
      p = p * 2.02 + vec2(17.0, 31.0);
      amplitude *= 0.5;
    }
    return total;
  }
`;

const LIQUID_MELT_BODY = `
  vec2 uv = v_uv;
  float amount = clamp(u_amount, 0.0, 1.0);
  float viscosity = clamp(u_viscosity, 0.0, 1.0);
  float gravity = max(0.0, u_gravity);
  float turbulence = clamp(u_turbulence, 0.0, 1.0);
  float tension = clamp(u_tension, 0.0, 1.0);
  float scale = max(1.0, u_scale);

  // Continuous liquid mask: stronger near the top, with organic vertical streaks.
  vec2 p = uv * vec2(scale * 0.75, scale * 1.15);
  float nA = fbm(p + vec2(u_seed * 0.11, 0.0));
  float nB = fbm(p * 1.7 + vec2(19.3, 7.1));
  float nC = fbm(p * 0.85 + vec2(-6.7, 12.9));
  float topBias = smoothstep(0.02, 0.85, 1.0 - uv.y);
  float strand = smoothstep(0.45, 0.92, nA);
  float pool = smoothstep(0.35, 0.95, nC);
  float mask = amount * topBias * mix(strand, pool, tension);

  // Compute a smooth, direct displacement field.
  // Viscosity reduces lateral wobble and makes the melt more cohesive.
  float wobble = (nB - 0.5) * turbulence * (1.0 - viscosity);
  float drip = (0.03 + 0.18 * mask) * gravity;
  float stretch = mix(0.11, 0.02, viscosity) * (0.35 + 0.65 * tension);

  // Domain warp keeps the distortion continuous and fluid-like.
  float gradE = 0.015;
  float gx = fbm(p + vec2(gradE, 0.0)) - fbm(p - vec2(gradE, 0.0));
  float gy = fbm(p + vec2(0.0, gradE)) - fbm(p - vec2(0.0, gradE));
  vec2 flow = vec2(gx, gy) * (0.8 + 1.6 * turbulence);

  vec2 warpedUv = uv;
  warpedUv.x += (flow.x + wobble) * stretch * mask;
  warpedUv.y += drip * (0.65 + 0.35 * nB);
  warpedUv.y += flow.y * 0.02 * (1.0 - tension);

  // Pull the melt down in the center of each strand, then tighten it with surface tension.
  float strandCenter = smoothstep(0.2, 0.8, nA);
  warpedUv.x += (strandCenter - 0.5) * (1.0 - tension) * 0.04 * mask;

  gl_FragColor = sampleLinear(clamp(warpedUv, vec2(0.0), vec2(1.0)));
`;

const LIQUID_MELT_FRAGMENT = fragmentShaderSource(LIQUID_MELT_HEADER, LIQUID_MELT_BODY);

export default createGpuEffect({
  id: "liquid-melt",
  name: "Liquid Melt",
  icon: "bi-droplet-half",
  description: "Creates viscous downward liquid distortion with procedural flow, drips, and surface tension.",
  params: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "scale", label: "Flow Scale", type: "range", min: 1, max: 100, step: 1 },
    { key: "viscosity", label: "Viscosity", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "gravity", label: "Gravity", type: "range", min: 0, max: 3, step: 0.01 },
    { key: "turbulence", label: "Turbulence", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "tension", label: "Surface Tension", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "seed", label: "Seed", type: "range", min: 0, max: 100, step: 1 },
  ],
  defaultParams: { amount: 0.35, scale: 22, viscosity: 0.7, gravity: 1.0, turbulence: 0.35, tension: 0.45, seed: 0 },
  render: {
    isNeutral(params) {
      return Number(params.amount ?? 0) <= 0;
    },
    passes(params) {
      const amount = Number(params.amount ?? 0);
      if (amount <= 0) return [];

      return [
        pass(LIQUID_MELT_FRAGMENT, {
          u_amount: amount,
          u_scale: Number(params.scale ?? 24),
          u_viscosity: Number(params.viscosity ?? 0.7),
          u_gravity: Number(params.gravity ?? 1.0),
          u_turbulence: Number(params.turbulence ?? 0.35),
          u_tension: Number(params.tension ?? 0.45),
          u_seed: Number(params.seed ?? 0),
        }),
      ];
    },
  },
});
