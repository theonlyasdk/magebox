import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const GLITCH_HEADER = `
  uniform float u_amount;
  uniform float u_split;
  uniform float u_shift;
  uniform float u_seed;

  // Simple hash for randomness
  float hash(vec2 p) {
    return fract(sin(dot(p + u_seed, vec2(127.1, 311.7))) * 43758.5453);
  }
`;

const GLITCH_BODY = `
  vec2 uv = v_uv;
  
  // 1. Horizontal Scanline Shifting
  // We use a stepped hash to create horizontal 'bands' that shift
  float lineId = floor(uv.y * 50.0);
  float lineNoise = hash(vec2(lineId, lineId)) - 0.5;
  
  if (abs(lineNoise) < u_shift * u_amount) {
    uv.x += lineNoise * u_amount * 0.1;
  }

  // 2. Block Displacement
  // Random rectangular 'glitch blocks'
  float blockSize = 8.0;
  vec2 blockId = floor(uv * blockSize);
  float blockNoise = hash(blockId);
  if (blockNoise > 1.0 - (0.1 * u_amount)) {
    uv += (hash(blockId + 0.5) - 0.5) * 0.05 * u_amount;
  }

  // 3. RGB Split (Chromatic Aberration)
  float splitDist = u_split * u_amount * 0.05;
  float r = sampleLinear(uv + vec2(splitDist, 0.0)).r;
  float g = sampleLinear(uv).g;
  float b = sampleLinear(uv - vec2(splitDist, 0.0)).b;
  
  vec3 finalRgb = vec3(r, g, b);
  
  // 4. Static / Noise overlay
  float noise = hash(v_uv * 100.0) - 0.5;
  finalRgb += noise * 0.05 * u_amount;

  gl_FragColor = vec4(clamp(finalRgb, 0.0, 1.0), sampleLinear(uv).a);
`;

const GLITCH_FRAGMENT = fragmentShaderSource(GLITCH_HEADER, GLITCH_BODY);

export default createGpuEffect({
  id: "glitch",
  name: "Glitch",
  icon: "bi-lightning-charge",
  description: "Simulates digital data corruption and signal interference.",
  params: [
    { key: "amount", label: "Intensity", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "split", label: "RGB Split", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "shift", label: "Line Shift", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "seed", label: "Seed", type: "range", min: 0, max: 100, step: 1 },
  ],
  defaultParams: { amount: 0.3, split: 0.4, shift: 0.2, seed: 0 },
  render: {
    isNeutral(params) {
      return Number(params.amount ?? 0) <= 0;
    },
    passes(params) {
      const amount = Number(params.amount ?? 0);
      if (amount <= 0) return [];
      
      return [
        pass(GLITCH_FRAGMENT, {
          u_amount: amount,
          u_split: Number(params.split ?? 0.4),
          u_shift: Number(params.shift ?? 0.2),
          u_seed: Number(params.seed ?? 0),
        }),
      ];
    },
  },
});
