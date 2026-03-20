import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const ADJUSTMENTS_FRAGMENT = fragmentShaderSource(
  "uniform float u_brightness; uniform float u_contrast; uniform float u_exposure; uniform float u_saturation; uniform float u_gamma; uniform float u_hue; uniform float u_temperature; uniform float u_tint; uniform float u_sepia; uniform float u_invert;",
  `
  vec4 color = sampleLinear(v_uv);
  vec3 rgb = color.rgb;

  // Exposure
  rgb *= pow(2.0, u_exposure);

  // Brightness
  rgb += u_brightness;

  // Contrast
  rgb = (rgb - 0.5) * u_contrast + 0.5;

  // Saturation
  float l = luminance(rgb);
  rgb = mix(vec3(l), rgb, u_saturation);

  // Temperature (Warm/Cool)
  rgb.r += u_temperature * 0.1;
  rgb.b -= u_temperature * 0.1;

  // Tint (Green/Magenta)
  rgb.g -= u_tint * 0.05;
  rgb.r += u_tint * 0.025;
  rgb.b += u_tint * 0.025;

  // Sepia
  if (u_sepia > 0.0) {
    vec3 sepia = vec3(
      dot(rgb, vec3(0.393, 0.769, 0.189)),
      dot(rgb, vec3(0.349, 0.686, 0.168)),
      dot(rgb, vec3(0.272, 0.534, 0.131))
    );
    rgb = mix(rgb, sepia, u_sepia);
  }

  // Hue Shift
  if (abs(u_hue) > 0.001) {
    vec3 hsv = rgb2hsv(rgb);
    hsv.x = mod(hsv.x + u_hue, 1.0);
    // hsv2rgb inline
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(hsv.xxx + K.xyz) * 6.0 - K.www);
    rgb = hsv.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), hsv.y);
  }

  // Gamma
  rgb = pow(max(rgb, 0.0), vec3(1.0 / max(u_gamma, 0.01)));

  // Invert
  rgb = mix(rgb, 1.0 - rgb, u_invert);

  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
`,
);

export default defineGpuEffect({
  id: "adjustments",
  name: "Adjustments",
  icon: "bi-sliders",
  description: "Basic color and luminance adjustments",
  controls: [
    { key: "exposure", label: "Exposure", type: "range", min: -4, max: 4, step: 0.01, unit: " EV" },
    { key: "brightness", label: "Brightness", type: "range", min: -1, max: 1, step: 0.01 },
    { key: "contrast", label: "Contrast", type: "range", min: 0, max: 3, step: 0.01 },
    { key: "saturation", label: "Saturation", type: "range", min: 0, max: 3, step: 0.01 },
    { key: "temperature", label: "Temperature", type: "range", min: -1, max: 1, step: 0.01 },
    { key: "tint", label: "Tint", type: "range", min: -1, max: 1, step: 0.01 },
    { key: "sepia", label: "Sepia", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "hue", label: "Hue Shift", type: "range", min: -0.5, max: 0.5, step: 0.01 },
    { key: "gamma", label: "Gamma", type: "range", min: 0.1, max: 3, step: 0.01 },
    { key: "invert", label: "Invert", type: "range", min: 0, max: 1, step: 1 },
  ],
  defaultParams: {
    exposure: 0,
    brightness: 0,
    contrast: 1,
    saturation: 1,
    temperature: 0,
    tint: 0,
    sepia: 0,
    hue: 0,
    gamma: 1,
    invert: 0,
  },
  gl: {
    isNeutral(params) {
      return (
        Number(params.exposure ?? 0) === 0 &&
        Number(params.brightness ?? 0) === 0 &&
        Number(params.contrast ?? 1) === 1 &&
        Number(params.saturation ?? 1) === 1 &&
        Number(params.temperature ?? 0) === 0 &&
        Number(params.tint ?? 0) === 0 &&
        Number(params.sepia ?? 0) === 0 &&
        Number(params.hue ?? 0) === 0 &&
        Number(params.gamma ?? 1) === 1 &&
        Number(params.invert ?? 0) === 0
      );
    },
    passes(params) {
      return [
        pass(ADJUSTMENTS_FRAGMENT, {
          u_exposure: Number(params.exposure ?? 0),
          u_brightness: Number(params.brightness ?? 0),
          u_contrast: Number(params.contrast ?? 1),
          u_saturation: Number(params.saturation ?? 1),
          u_temperature: Number(params.temperature ?? 0),
          u_tint: Number(params.tint ?? 0),
          u_sepia: Number(params.sepia ?? 0),
          u_hue: Number(params.hue ?? 0),
          u_gamma: Number(params.gamma ?? 1),
          u_invert: Number(params.invert ?? 0),
        }),
      ];
    },
  },
});
