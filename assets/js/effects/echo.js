import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const ECHO_FRAGMENT = fragmentShaderSource(
  `
  uniform float u_distance;
  uniform float u_angle;
  uniform int u_count;
  uniform float u_decay;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  vec3 result = color.rgb;
  float totalWeight = 1.0;
  
  vec2 dir = vec2(cos(u_angle), sin(u_angle)) * u_texelSize * u_distance;
  
  for (int i = 1; i <= 16; i++) {
    if (i > u_count) break;
    
    float fi = float(i);
    float weight = pow(u_decay, fi);
    vec2 offset = dir * fi;
    
    vec4 samp = sampleLinear(v_uv - offset);
    result += samp.rgb * weight;
    totalWeight += weight;
  }
  
  gl_FragColor = vec4(result / totalWeight, color.a);
`,
);

export default defineGpuEffect({
  id: "echo",
  name: "Echo",
  icon: "bi-layers",
  description: "Creates a directional trail or ghosting effect.",
  params: [
    { key: "distance", label: "Distance", type: "range", min: 0, max: 100, step: 1, unit: "px" },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 360, step: 1, unit: "°" },
    { key: "count", label: "Count", type: "range", min: 1, max: 16, step: 1 },
    { key: "decay", label: "Decay", type: "range", min: 0.1, max: 1, step: 0.01 },
  ],
  defaultParams: { distance: 20, angle: 0, count: 4, decay: 0.7 },
  gl: {
    isNeutral(params) {
      return Number(params.distance ?? 0) <= 0;
    },
    passes(params) {
      const dist = Number(params.distance ?? 0);
      if (dist <= 0) return [];
      
      return [
        pass(ECHO_FRAGMENT, {
          u_distance: dist,
          u_angle: (Number(params.angle ?? 0) * Math.PI) / 180,
          u_count: parseInt(params.count ?? "4"),
          u_decay: Number(params.decay ?? 0.7),
        }),
      ];
    },
  },
});
