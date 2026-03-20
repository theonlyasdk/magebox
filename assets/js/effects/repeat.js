import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const REPEAT_FRAGMENT = fragmentShaderSource(
  "uniform float u_scale; uniform vec2 u_offset; uniform float u_randomise; uniform float u_featherAmount; uniform float u_featherRadius; uniform float u_alphaFeather;",
  `
  vec2 tiledPos = v_uv * u_outputSize / max(u_scale, 0.0001);
  vec2 basePos = tiledPos - u_offset;
  
  // Stochastic Tiling logic to avoid gaps and hide repetition
  vec2 uv = basePos / u_inputSize;
  vec2 iuv = floor(uv);
  vec2 fuv = fract(uv);

  vec4 sum = vec4(0.0);
  float totalW = 0.0;

  // Sample 3x3 grid of tiles to ensure no gaps even with high randomization
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 cellId = iuv + neighbor;
      
      // Hash for per-tile random offset
      vec2 h = fract(sin(vec2(dot(cellId, vec2(127.1, 311.7)), dot(cellId, vec2(269.5, 183.3)))) * 43758.5453);
      vec2 rand = h * u_randomise;
      
      // Sample with random offset using fract to ensure seamless repetition
      vec2 sampleUv = fract(uv + rand);
      vec4 col = sampleNearest(sampleUv);
      
      // Weight based on distance from the pixel to the neighbor cell center
      // Radius: controls how far the blend reaches
      // Amount: controls the sharpness of the transition (blur-like average)
      float dist = length(fuv - neighbor - 0.5);
      float w = smoothstep(max(0.001, u_featherRadius), 0.0, dist);
      w = pow(w, max(0.1, u_featherAmount));

      // Alpha feather: fade out at the physical edges of the source image
      if (u_alphaFeather > 0.0) {
        vec2 edgeDist = min(sampleUv, 1.0 - sampleUv);
        float d = min(edgeDist.x, edgeDist.y);
        col.a *= smoothstep(0.0, u_alphaFeather, d);
      }

      sum += col * w;
      totalW += w;
    }
  }

  if (totalW > 0.0) {
    gl_FragColor = sum / totalW;
  } else {
    // Fallback if no weights
    gl_FragColor = sampleNearest(fract(uv));
  }
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
    { key: "randomise", label: "Randomise", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "featherAmount", label: "Feather Amount", type: "range", min: 0.1, max: 10, step: 0.1 },
    { key: "featherRadius", label: "Feather Radius", type: "range", min: 0.1, max: 2, step: 0.01 },
    { key: "alphaFeather", label: "Alpha Feather", type: "range", min: 0, max: 0.5, step: 0.01 },
  ],
  defaultParams: { scale: 1, offsetX: 0, offsetY: 0, randomise: 0, featherAmount: 1, featherRadius: 1, alphaFeather: 0 },
  gl: {
    isNeutral(params) {
      const scale = Number(params.scale ?? 1);
      const ox = Number(params.offsetX ?? 0);
      const oy = Number(params.offsetY ?? 0);
      const rand = Number(params.randomise ?? 0);
      const alphaFeather = Number(params.alphaFeather ?? 0);
      return scale === 1 && ox === 0 && oy === 0 && rand === 0 && alphaFeather === 0;
    },
    passes(params) {
      const scale = Math.min(20, Math.max(0.05, Number(params.scale ?? 1)));
      const ox = Number(params.offsetX ?? 0);
      const oy = Number(params.offsetY ?? 0);
      const rand = Number(params.randomise ?? 0);
      const featherAmount = Number(params.featherAmount ?? 1);
      const featherRadius = Number(params.featherRadius ?? 1);
      const alphaFeather = Number(params.alphaFeather ?? 0);
      
      if (scale === 1 && ox === 0 && oy === 0 && rand === 0 && alphaFeather === 0) return [];
      
      return [pass(REPEAT_FRAGMENT, { 
        u_scale: scale, 
        u_offset: [ox, oy],
        u_randomise: rand,
        u_featherAmount: featherAmount,
        u_featherRadius: featherRadius,
        u_alphaFeather: alphaFeather
      }, { filter: "nearest" })];
    },
  },
});
