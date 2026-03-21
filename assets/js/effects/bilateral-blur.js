import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const BILATERAL_FRAGMENT = fragmentShaderSource(
  `
  uniform float u_radius;
  uniform float u_sigmaR;
  `,
  `
  vec4 centerColor = sampleLinear(v_uv);
  
  if (u_radius <= 0.0) {
    gl_FragColor = centerColor;
    return;
  }

  float sigmaS = u_radius;
  float sigmaR = max(u_sigmaR, 0.001);
  
  float sigmaS2 = 2.0 * sigmaS * sigmaS;
  float sigmaR2 = 2.0 * sigmaR * sigmaR;

  vec3 sum = vec3(0.0);
  float totalWeight = 0.0;

  int r = int(ceil(sigmaS * 1.5));
  // Limit radius for performance
  if (r > 8) r = 8;

  for (int y = -8; y <= 8; y++) {
    if (y < -r || y > r) continue;
    for (int x = -8; x <= 8; x++) {
      if (x < -r || x > r) continue;

      vec2 offset = vec2(float(x), float(y));
      vec4 sampleCol = sampleLinear(v_uv + offset * u_texelSize);
      
      float spatialDist2 = dot(offset, offset);
      float rangeDist2 = dot(sampleCol.rgb - centerColor.rgb, sampleCol.rgb - centerColor.rgb);
      
      float weight = exp(-(spatialDist2 / sigmaS2) - (rangeDist2 / sigmaR2));
      
      sum += sampleCol.rgb * weight;
      totalWeight += weight;
    }
  }

  gl_FragColor = vec4(sum / totalWeight, centerColor.a);
`,
);

export default defineGpuEffect({
  id: "bilateral",
  name: "Bilateral Blur",
  icon: "bi-droplet-half",
  description: "Edge-preserving blur that smooths surfaces while keeping outlines sharp.",
  params: [
    { key: "radius", label: "Radius", type: "range", min: 0, max: 10, step: 0.1, unit: "px" },
    { key: "strength", label: "Edge Sharpness", type: "range", min: 0.01, max: 1, step: 0.01 },
  ],
  defaultParams: { radius: 3, strength: 0.2 },
  gl: {
    isNeutral(params) {
      const radius = Number(params.radius ?? 0);
      return radius <= 0;
    },
    passes(params) {
      const radius = Number(params.radius ?? 0);
      if (radius <= 0) return [];
      
      return [
        pass(BILATERAL_FRAGMENT, {
          u_radius: radius,
          u_sigmaR: Number(params.strength ?? 0.2),
        }),
      ];
    },
  },
});
