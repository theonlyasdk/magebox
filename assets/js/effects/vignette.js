import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const VIGNETTE_FRAGMENT = fragmentShaderSource(
  "uniform float u_intensity; uniform float u_smoothness;",
  `
  vec4 color = sampleLinear(v_uv);
  vec2 uv = v_uv * 2.0 - 1.0;
  float dist = length(uv);
  float vignette = smoothstep(u_intensity, u_intensity - u_smoothness, dist);
  gl_FragColor = vec4(color.rgb * vignette, color.a);
`,
);

export default defineGpuEffect({
  id: "vignette",
  name: "Vignette",
  icon: "bi-circle",
  description: "Darkens the edges of the image or canvas.",
  controls: [
    {
      key: "resolutionMode",
      label: "Mode",
      type: "select",
      options: [
        { label: "Layer", value: "layer" },
        { label: "Canvas", value: "canvas" },
      ],
    },
    { key: "intensity", label: "Intensity", type: "range", min: 0, max: 2, step: 0.01 },
    { key: "smoothness", label: "Smoothness", type: "range", min: 0.01, max: 2, step: 0.01 },
  ],
  defaultParams: { resolutionMode: "canvas", intensity: 1.0, smoothness: 0.5 },
  gl: {
    isNeutral(params) {
      return Number(params.intensity ?? 1.0) >= 2.0;
    },
    passes(params) {
      return [
        pass(VIGNETTE_FRAGMENT, {
          u_intensity: Number(params.intensity ?? 1.0),
          u_smoothness: Number(params.smoothness ?? 0.5),
        }),
      ];
    },
  },
});
