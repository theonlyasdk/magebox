import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const WARP_FRAGMENT = fragmentShaderSource(
  "uniform float u_amplitude; uniform float u_frequency; uniform float u_axis;",
  `
  vec2 uv = v_uv;
  float tau = 6.28318530718;
  if (u_axis < 0.5) {
    uv.x += sin(v_uv.y * tau * u_frequency) * (u_amplitude / u_inputSize.x);
  } else {
    uv.y += sin(v_uv.x * tau * u_frequency) * (u_amplitude / u_inputSize.y);
  }
  gl_FragColor = sampleLinear(uv);
`,
);

export default defineGpuEffect({
  id: "warp",
  name: "Warp",
  icon: "bi-arrow-repeat",
  description: "Waves the image using sine-based warping.",
  controls: [
    { key: "amplitude", label: "Amplitude", type: "range", min: 0, max: 100, step: 1, unit: "px" },
    { key: "frequency", label: "Frequency", type: "range", min: 0.1, max: 10, step: 0.1 },
    {
      key: "axis",
      label: "Axis",
      type: "select",
      options: [
        { label: "Horizontal", value: "x" },
        { label: "Vertical", value: "y" },
      ],
    },
  ],
  defaultParams: { amplitude: 20, frequency: 2, axis: "x" },
  gl: {
    isNeutral(params) {
      return Number(params.amplitude ?? 0) <= 0;
    },
    passes(params) {
      const amp = Math.min(200, Math.max(0, Number(params.amplitude ?? 0)));
      if (amp <= 0) return [];
      return [
        pass(WARP_FRAGMENT, {
          u_amplitude: amp,
          u_frequency: Math.min(20, Math.max(0.1, Number(params.frequency ?? 2))),
          u_axis: params.axis === "y" ? 1 : 0,
        }),
      ];
    },
  },
});
