import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const BLOOM_FRAGMENT = fragmentShaderSource(
  "uniform float u_threshold; uniform float u_intensity; uniform float u_radius;",
  `
  vec4 color = sampleLinear(v_uv);
  vec3 result = color.rgb;
  
  // Basic single-pass bloom approximation
  vec3 bloom = vec3(0.0);
  float totalWeight = 0.0;
  
  // Sample a small grid to find bright neighbors
  for (float y = -2.0; y <= 2.0; y++) {
    for (float x = -2.0; x <= 2.0; x++) {
      if (x == 0.0 && y == 0.0) continue;
      
      vec2 offset = vec2(x, y) * u_texelSize * u_radius;
      vec3 samp = sampleLinear(v_uv + offset).rgb;
      
      // Extract brightness above threshold
      float luma = luminance(samp);
      float weight = smoothstep(u_threshold, u_threshold + 0.2, luma);
      
      bloom += samp * weight;
      totalWeight += 1.0;
    }
  }
  
  if (totalWeight > 0.0) {
    result += (bloom / totalWeight) * u_intensity;
  }
  
  gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
`,
);

export default defineGpuEffect({
  id: "bloom",
  name: "Bloom",
  icon: "bi-brightness-high",
  description: "Adds a glow effect to bright areas of the image.",
  controls: [
    { key: "threshold", label: "Threshold", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "intensity", label: "Intensity", type: "range", min: 0, max: 5, step: 0.05 },
    { key: "radius", label: "Radius", type: "range", min: 1, max: 10, step: 0.1, unit: "px" },
  ],
  defaultParams: { threshold: 0.6, intensity: 1.0, radius: 2.0 },
  gl: {
    isNeutral(params) {
      return Number(params.intensity ?? 1) <= 0;
    },
    passes(params) {
      return [
        pass(BLOOM_FRAGMENT, {
          u_threshold: Number(params.threshold ?? 0.6),
          u_intensity: Number(params.intensity ?? 1.0),
          u_radius: Number(params.radius ?? 2.0),
        }),
      ];
    },
  },
});
