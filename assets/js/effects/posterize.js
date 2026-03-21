import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const POSTERIZE_FRAGMENT = fragmentShaderSource(
  `
  uniform float u_levels;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  vec3 rgb = color.rgb;
  rgb = floor(rgb * u_levels) / max(u_levels - 1.0, 1.0);
  gl_FragColor = vec4(rgb, color.a);
`,
);

export default defineGpuEffect({
  id: "posterize",
  name: "Posterize",
  icon: "bi-layers-half",
  description: "Reduces the number of colors in the image.",
  params: [
    { key: "levels", label: "Levels", type: "range", min: 2, max: 255, step: 1 },
  ],
  defaultParams: { levels: 4 },
  gl: {
    isNeutral(params) {
      return Number(params.levels ?? 4) >= 255;
    },
    passes(params) {
      const levels = Math.max(2.0, Number(params.levels ?? 4));
      return [pass(POSTERIZE_FRAGMENT, { u_levels: levels })];
    },
  },
});
