import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const THRESHOLD_FRAGMENT = fragmentShaderSource(
  `
  uniform float u_threshold;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  float l = luminance(color.rgb);
  float result = step(u_threshold, l);
  gl_FragColor = vec4(vec3(result), color.a);
`,
);

export default createGpuEffect({
  id: "threshold",
  name: "Threshold",
  icon: "bi-circle-half",
  description: "Converts the image to pure black and white based on a threshold.",
  params: [
    { key: "threshold", label: "Threshold", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  defaultParams: { threshold: 0.5 },
  render: {
    passes(params) {
      return [
        pass(THRESHOLD_FRAGMENT, {
          u_threshold: Number(params.threshold ?? 0.5),
        }),
      ];
    },
  },
});
