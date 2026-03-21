import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const SCANLINES_FRAGMENT = fragmentShaderSource(
  `
  uniform float u_density;
  uniform float u_opacity;
  uniform float u_turbulence;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  
  float jitter = 0.0;
  if (u_turbulence > 0.0) {
    jitter = sin(v_uv.x * 10.0 + v_uv.y * 5.0) * 0.05 * u_turbulence;
  }
  
  float scanline = sin((v_uv.y + jitter) * u_outputSize.y * u_density) * 0.5 + 0.5;
  vec3 result = mix(color.rgb, color.rgb * scanline, u_opacity);
  gl_FragColor = vec4(result, color.a);
`,
);

export default defineGpuEffect({
  id: "scanlines",
  name: "Scanlines",
  icon: "bi-list",
  description: "Adds CRT-style horizontal scanlines with optional distortion.",
  params: [
    { key: "density", label: "Density", type: "range", min: 0.1, max: 2, step: 0.01 },
    { key: "opacity", label: "Opacity", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "turbulence", label: "Turbulence", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  defaultParams: { density: 1.0, opacity: 0.3, turbulence: 0 },
  gl: {
    isNeutral(params) {
      return Number(params.opacity ?? 0) <= 0;
    },
    passes(params) {
      const opacity = Number(params.opacity ?? 0);
      if (opacity <= 0) return [];
      return [
        pass(SCANLINES_FRAGMENT, {
          u_density: Number(params.density ?? 1.0),
          u_opacity: opacity,
          u_turbulence: Number(params.turbulence ?? 0),
        }),
      ];
    },
  },
});
