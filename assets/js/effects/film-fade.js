import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const FILM_FRAGMENT = fragmentShaderSource(
  `
  uniform float u_fade;
  uniform vec3 u_tint;
  uniform float u_saturation;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  vec3 rgb = color.rgb;

  // 1. Lift blacks (the core 'fade' look)
  // Maps 0.0 to a higher value based on u_fade
  vec3 result = rgb * (1.0 - u_fade * 0.3) + (u_fade * 0.12);
  
  // 2. Apply cinematic shadow tinting
  float luma = luminance(result);
  float shadowMask = smoothstep(0.7, 0.0, luma);
  vec3 tintedShadows = mix(result, result * u_tint * 1.5, shadowMask * u_fade);
  result = mix(result, tintedShadows, u_fade);

  // 3. Adjust saturation (film often looks better slightly desaturated)
  float l = luminance(result);
  result = mix(vec3(l), result, u_saturation);

  gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
`,
);

export default defineGpuEffect({
  id: "film-fade",
  name: "Film Fade",
  icon: "bi-camera-reels",
  description: "Mimics analog film by lifting blacks and adding cinematic color tints.",
  params: [
    { key: "fade", label: "Fade Amount", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "tint", label: "Shadow Tint", type: "color" },
    { key: "saturation", label: "Saturation", type: "range", min: 0, max: 2, step: 0.01 },
  ],
  defaultParams: { 
    fade: 0.4, 
    tint: "#32535e", // Classic cinematic teal tint
    saturation: 0.8 
  },
  gl: {
    isNeutral(params) {
      return Number(params.fade ?? 0) <= 0 && Number(params.saturation ?? 1) === 1;
    },
    passes(params) {
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
      };

      return [
        pass(FILM_FRAGMENT, {
          u_fade: Number(params.fade ?? 0.4),
          u_tint: hexToRgb(params.tint ?? "#32535e"),
          u_saturation: Number(params.saturation ?? 0.8),
        }),
      ];
    },
  },
});
