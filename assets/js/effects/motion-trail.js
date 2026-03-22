import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const MOTION_TRAIL_FRAGMENT = fragmentShaderSource(
  `
  uniform int u_mode;
  uniform float u_length;
  uniform float u_angle;
  uniform int u_samples;
  uniform float u_decay;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  vec3 result = color.rgb;
  
  // Calculate the step vector based on total length and sample count
  vec2 dir = vec2(cos(u_angle), sin(u_angle)) * u_texelSize;
  vec2 stepVec = dir * (u_length / float(u_samples));
  
  if (u_mode == 0) {
    // Mode: Trail (Ghosting/Max-blending)
    for (int i = 1; i <= 64; i++) {
      if (i >= u_samples) break;
      
      float weight = pow(u_decay, float(i) * (u_length / float(u_samples)) / 10.0);
      vec4 samp = sampleLinear(v_uv - stepVec * float(i));
      
      // Use max blending for a punchy trailing effect
      result = max(result, samp.rgb * weight);
    }
  } else {
    // Mode: Smear (Continuous Directional Blur)
    float totalWeight = 1.0;
    for (int i = 1; i <= 64; i++) {
      if (i >= u_samples) break;
      
      // Linear falloff for the smear
      float weight = 1.0 - (float(i) / float(u_samples));
      vec4 samp = sampleLinear(v_uv - stepVec * float(i));
      
      result += samp.rgb * weight;
      totalWeight += weight;
    }
    result /= totalWeight;
  }
  
  gl_FragColor = vec4(result, color.a);
`,
);

export default createGpuEffect({
  id: "motion-trail",
  name: "Motion Trail",
  icon: "bi-wind",
  description: "Simulates motion by adding trailing ghosts or continuous smearing.",
  params: [
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [
        { label: "Trail (Ghosts)", value: "0" },
        { label: "Smear (Blur)", value: "1" },
      ],
    },
    { key: "length", label: "Length", type: "range", min: 0, max: 200, step: 1, unit: "px" },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 360, step: 1, unit: "°" },
    { key: "samples", label: "Quality", type: "range", min: 4, max: 64, step: 1 },
    { 
      key: "decay", 
      label: "Decay", 
      type: "range", 
      min: 0.1, max: 1, step: 0.01,
      show_on: { key: "mode", value: "0" }
    },
  ],
  defaultParams: { mode: "1", length: 40, angle: 0, samples: 24, decay: 0.8 },
  render: {
    isNeutral(params) {
      return Number(params.length ?? 0) <= 0;
    },
    passes(params) {
      const len = Number(params.length ?? 0);
      if (len <= 0) return [];
      
      return [
        pass(MOTION_TRAIL_FRAGMENT, {
          u_mode: parseInt(params.mode ?? "1"),
          u_length: len,
          u_angle: (Number(params.angle ?? 0) * Math.PI) / 180,
          u_samples: parseInt(params.samples ?? "24"),
          u_decay: Number(params.decay ?? 0.8),
        }),
      ];
    },
  },
});
