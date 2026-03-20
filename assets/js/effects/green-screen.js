import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const GREEN_SCREEN_FRAGMENT = fragmentShaderSource(
  "uniform vec3 u_target; uniform float u_tolerance; uniform float u_softness;",
  `
  vec4 color = sampleLinear(v_uv);
  vec3 keyHsv = rgb2hsv(u_target);
  vec3 hsv = rgb2hsv(color.rgb);
  float softBand = u_tolerance * (0.5 + u_softness);
  float t0 = max(0.0, u_tolerance - softBand);
  float t1 = u_tolerance + softBand;
  float d = hueDistance01(hsv.x, keyHsv.x);
  float k = d <= t0 ? 1.0 : (d >= t1 ? 0.0 : 1.0 - (d - t0) / max(t1 - t0, 0.0001));
  gl_FragColor = vec4(color.rgb, color.a * (1.0 - k));
`,
);

function hexToRgb01(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex));
  if (!m) return [0, 1, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default defineGpuEffect({
  id: "greenScreen",
  name: "Green Screen",
  icon: "bi-person-bounding-box",
  description: "Keys out a chosen color and makes it transparent (chroma key).",
  controls: [
    { key: "color", label: "Key color", type: "color" },
    { key: "tolerance", label: "Tolerance", type: "range", min: 0, max: 180, step: 1, unit: "°" },
    { key: "softness", label: "Softness", type: "range", min: 0, max: 100, step: 1, unit: "%" },
  ],
  defaultParams: { color: "#00ff00", tolerance: 35, softness: 30 },
  gl: {
    passes(params) {
      return [
        pass(GREEN_SCREEN_FRAGMENT, {
          u_target: hexToRgb01(params.color ?? "#00ff00"),
          u_tolerance: Math.max(0, Math.min(0.5, Number(params.tolerance ?? 35) / 360)),
          u_softness: Math.max(0, Math.min(1, Number(params.softness ?? 30) / 100)),
        }),
      ];
    },
  },
});
