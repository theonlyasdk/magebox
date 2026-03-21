import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const GRADIENT_MAP_FRAGMENT = fragmentShaderSource(
  `
  uniform vec3 u_colorLow;
  uniform vec3 u_colorMid;
  uniform vec3 u_colorHigh;
  uniform float u_opacity;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  float l = luminance(color.rgb);
  
  vec3 grad;
  if (l < 0.5) {
    grad = mix(u_colorLow, u_colorMid, l * 2.0);
  } else {
    grad = mix(u_colorMid, u_colorHigh, (l - 0.5) * 2.0);
  }
  
  vec3 finalRgb = mix(color.rgb, grad, u_opacity);
  gl_FragColor = vec4(finalRgb, color.a);
`,
);

export default defineGpuEffect({
  id: "gradient-map",
  name: "Gradient Map",
  icon: "bi-palette",
  description: "Maps the image luminance to a color gradient.",
  params: [
    { key: "colorLow", label: "Shadows", type: "color" },
    { key: "colorMid", label: "Midtones", type: "color" },
    { key: "colorHigh", label: "Highlights", type: "color" },
    { key: "opacity", label: "Opacity", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  defaultParams: {
    colorLow: "#000000",
    colorMid: "#808080",
    colorHigh: "#ffffff",
    opacity: 1.0,
  },
  gl: {
    isNeutral(params) {
      return Number(params.opacity ?? 1) <= 0;
    },
    passes(params) {
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
      };

      return [
        pass(GRADIENT_MAP_FRAGMENT, {
          u_colorLow: hexToRgb(params.colorLow ?? "#000000"),
          u_colorMid: hexToRgb(params.colorMid ?? "#808080"),
          u_colorHigh: hexToRgb(params.colorHigh ?? "#ffffff"),
          u_opacity: Number(params.opacity ?? 1.0),
        }),
      ];
    },
  },
});
