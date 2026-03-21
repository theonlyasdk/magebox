import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const CARTOON_FRAGMENT = fragmentShaderSource(
  `
  uniform float u_levels;
  uniform float u_edges;
  uniform float u_threshold;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  vec3 quantized = floor(color.rgb * max(u_levels - 1.0, 1.0) + 0.5) / max(u_levels - 1.0, 1.0);
  vec2 t = u_texelSize;
  float tl = luminance(sampleLinear(v_uv + vec2(-t.x, -t.y)).rgb);
  float tc = luminance(sampleLinear(v_uv + vec2(0.0, -t.y)).rgb);
  float tr = luminance(sampleLinear(v_uv + vec2(t.x, -t.y)).rgb);
  float ml = luminance(sampleLinear(v_uv + vec2(-t.x, 0.0)).rgb);
  float mr = luminance(sampleLinear(v_uv + vec2(t.x, 0.0)).rgb);
  float bl = luminance(sampleLinear(v_uv + vec2(-t.x, t.y)).rgb);
  float bc = luminance(sampleLinear(v_uv + vec2(0.0, t.y)).rgb);
  float br = luminance(sampleLinear(v_uv + vec2(t.x, t.y)).rgb);
  float gx = -tl + tr - 2.0 * ml + 2.0 * mr - bl + br;
  float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
  float mag = clamp(length(vec2(gx, gy)), 0.0, 1.0);
  float edge = smoothstep(u_threshold, 1.0, mag) * u_edges;
  gl_FragColor = vec4(quantized * (1.0 - edge), color.a);
`,
);

export default defineGpuEffect({
  id: "cartoon",
  name: "Cartoon",
  icon: "bi-magic",
  description: "Posterizes colors and adds edge lines for a cartoon look.",
  params: [
    { key: "levels", label: "Color levels", type: "range", min: 2, max: 16, step: 1 },
    { key: "edges", label: "Edges", type: "range", min: 0, max: 100, step: 1, unit: "%" },
    { key: "threshold", label: "Edge threshold", type: "range", min: 0, max: 255, step: 1 },
  ],
  defaultParams: { levels: 6, edges: 60, threshold: 50 },
  gl: {
    passes(params) {
      return [
        pass(CARTOON_FRAGMENT, {
          u_levels: Math.max(2, Number(params.levels ?? 6)),
          u_edges: Math.min(1, Math.max(0, Number(params.edges ?? 0) / 100)),
          u_threshold: Math.min(1, Math.max(0, Number(params.threshold ?? 50) / 255)),
        }),
      ];
    },
  },
});
