import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const COLOR_ISOLATION_FRAGMENT = fragmentShaderSource(
  "uniform vec3 u_target; uniform float u_tolerance; uniform float u_softness;",
  `
  vec4 color = sampleLinear(v_uv);
  vec3 targetHsl = rgb2hsl(u_target);
  vec3 colorHsl = rgb2hsl(color.rgb);
  float softBand = u_tolerance * (0.5 + u_softness);
  float t0 = max(0.0, u_tolerance - softBand);
  float t1 = u_tolerance + softBand;
  float d = hueDistance01(colorHsl.x, targetHsl.x);
  float keep = d <= t0 ? 1.0 : (d >= t1 ? 0.0 : 1.0 - (d - t0) / max(t1 - t0, 0.0001));
  float gray = luminance(color.rgb);
  gl_FragColor = vec4(mix(vec3(gray), color.rgb, keep), color.a);
`,
);

function hexToRgb01(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex));
  if (!m) return [1, 0, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default defineGpuEffect({
  id: "colorIsolation",
  name: "Color Isolation",
  icon: "bi-palette",
  description: "Keeps a selected color, makes everything else black & white.",
  controls: [
    { key: "color", label: "Target color", type: "color" },
    { key: "tolerance", label: "Tolerance", type: "range", min: 0, max: 180, step: 1, unit: "°" },
    { key: "softness", label: "Softness", type: "range", min: 0, max: 100, step: 1, unit: "%" },
  ],
  defaultParams: { color: "#ff0000", tolerance: 25, softness: 25 },
  gl: {
    passes(params) {
      return [
        pass(COLOR_ISOLATION_FRAGMENT, {
          u_target: hexToRgb01(params.color ?? "#ff0000"),
          u_tolerance: Math.max(0, Math.min(0.5, Number(params.tolerance ?? 25) / 360)),
          u_softness: Math.max(0, Math.min(1, Number(params.softness ?? 25) / 100)),
        }),
      ];
    },
  },
});
