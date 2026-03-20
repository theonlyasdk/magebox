import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const OUTLINE_FRAGMENT = fragmentShaderSource(
  "uniform float u_strength; uniform float u_threshold; uniform float u_invert;",
  `
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
  float edge = step(u_threshold, mag);
  float edgeVal = mix(edge, 1.0 - edge, u_invert);
  vec4 color = sampleLinear(v_uv);
  gl_FragColor = vec4(mix(color.rgb, vec3(edgeVal), u_strength), color.a);
`,
);

export default defineGpuEffect({
  id: "outline",
  name: "Outline",
  icon: "bi-bounding-box",
  description: "Detects edges and draws an outline on top of the image.",
  controls: [
    { key: "strength", label: "Strength", type: "range", min: 0, max: 100, step: 1, unit: "%" },
    { key: "threshold", label: "Threshold", type: "range", min: 0, max: 255, step: 1 },
    { key: "invert", label: "Invert", type: "range", min: 0, max: 1, step: 1 },
  ],
  defaultParams: { strength: 70, threshold: 40, invert: 0 },
  gl: {
    isNeutral(params) {
      return Number(params.strength ?? 0) <= 0;
    },
    passes(params) {
      const strength = Number(params.strength ?? 0) / 100;
      if (!Number.isFinite(strength) || strength <= 0) return [];
      return [
        pass(OUTLINE_FRAGMENT, {
          u_strength: Math.min(1, Math.max(0, strength)),
          u_threshold: Math.min(1, Math.max(0, Number(params.threshold ?? 40) / 255)),
          u_invert: Number(params.invert ?? 0) ? 1 : 0,
        }),
      ];
    },
  },
});
