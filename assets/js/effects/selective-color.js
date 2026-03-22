import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const SELECTIVE_FRAGMENT = fragmentShaderSource(
  `
  uniform vec3 u_reds;
  uniform vec3 u_yellows;
  uniform vec3 u_greens;
  uniform vec3 u_cyans;
  uniform vec3 u_blues;
  uniform vec3 u_magentas;
  uniform vec3 u_custom; // hueShift, satScale, valOffset
  uniform float u_customHue;
  uniform bool u_useCustom;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  vec3 hsv = rgb2hsv(color.rgb);
  float h = hsv.x;
  
  // Weights for standard color ranges
  float wR = max(0.0, 1.0 - min(abs(h - 0.0), abs(h - 1.0)) * 6.0);
  float wY = max(0.0, 1.0 - abs(h - 0.166) * 6.0);
  float wG = max(0.0, 1.0 - abs(h - 0.333) * 6.0);
  float wC = max(0.0, 1.0 - abs(h - 0.500) * 6.0);
  float wB = max(0.0, 1.0 - abs(h - 0.666) * 6.0);
  float wM = max(0.0, 1.0 - abs(h - 0.833) * 6.0);

  float shift, sat, val, totalW;

  if (u_useCustom) {
    // Custom Mode: calculate weight based on the picked hue
    float wCust = max(0.0, 1.0 - min(abs(h - u_customHue), abs(h - u_customHue + (h < u_customHue ? 1.0 : -1.0))) * 6.0);
    shift = u_custom.x * wCust;
    sat = u_custom.y * wCust;
    val = u_custom.z * wCust;
    totalW = wCust;
  } else {
    shift = u_reds.x * wR + u_yellows.x * wY + u_greens.x * wG + u_cyans.x * wC + u_blues.x * wB + u_magentas.x * wM;
    sat   = u_reds.y * wR + u_yellows.y * wY + u_greens.y * wG + u_cyans.y * wC + u_blues.y * wB + u_magentas.y * wM;
    val   = u_reds.z * wR + u_yellows.z * wY + u_greens.z * wG + u_cyans.z * wC + u_blues.z * wB + u_magentas.z * wM;
    totalW = wR + wY + wG + wC + wB + wM;
  }
  
  if (totalW > 0.001) {
    hsv.x = mod(hsv.x + (shift / totalW), 1.0);
    hsv.y = clamp(hsv.y * (1.0 + sat / totalW), 0.0, 3.0);
    hsv.z = clamp(hsv.z + (val / totalW), 0.0, 1.0);
  }

  gl_FragColor = vec4(hsv2rgb(hsv), color.a);
`,
);

const createRangeParams = (id, label) => [
  { key: `hue_${id}`, label: `${label} Hue`, type: "range", min: -0.5, max: 0.5, step: 0.01, show_on: { key: "target", value: id } },
  { key: `sat_${id}`, label: `${label} Sat`, type: "range", min: -1, max: 2, step: 0.01, show_on: { key: "target", value: id }, unit: "×" },
  { key: `val_${id}`, label: `${label} Brightness`, type: "range", min: -1, max: 1, step: 0.01, show_on: { key: "target", value: id } },
];

export default createGpuEffect({
  id: "selective-color",
  name: "Selective Color",
  icon: "bi-eyedropper",
  description: "Adjust specific color ranges or pick a custom color from the canvas.",
  params: [
    {
      key: "target",
      label: "Color to Adjust",
      type: "select",
      options: [
        { label: "Reds", value: "red" },
        { label: "Yellows", value: "yellow" },
        { label: "Greens", value: "green" },
        { label: "Cyans", value: "cyan" },
        { label: "Blues", value: "blue" },
        { label: "Magentas", value: "magenta" },
        { label: "Custom (Picker)", value: "custom" },
      ],
    },
    { key: "customColor", label: "Custom Color", type: "color", show_on: { key: "target", value: "custom" } },
    ...createRangeParams("red", "Reds"),
    ...createRangeParams("yellow", "Yellows"),
    ...createRangeParams("green", "Greens"),
    ...createRangeParams("cyan", "Cyans"),
    ...createRangeParams("blue", "Blues"),
    ...createRangeParams("magenta", "Magentas"),
    ...createRangeParams("custom", "Custom"),
  ],
  defaultParams: {
    target: "red",
    customColor: "#ff0000",
    hue_red: 0, sat_red: 0, val_red: 0,
    hue_yellow: 0, sat_yellow: 0, val_yellow: 0,
    hue_green: 0, sat_green: 0, val_green: 0,
    hue_cyan: 0, sat_cyan: 0, val_cyan: 0,
    hue_blue: 0, sat_blue: 0, val_blue: 0,
    hue_magenta: 0, sat_magenta: 0, val_magenta: 0,
    hue_custom: 0, sat_custom: 0, val_custom: 0,
  },
  render: {
    isNeutral(params) {
      for (const key in params) {
        if (key === "target" || key === "customColor") continue;
        if (params[key] !== 0) return false;
      }
      return true;
    },
    passes(params) {
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
      };

      const rgbToHsv = (r, g, b) => {
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        let d = max - min;
        s = max === 0 ? 0 : d / max;
        if (max === min) { h = 0; }
        else {
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        return [h, s, v];
      };

      const customHsv = rgbToHsv(...hexToRgb(params.customColor || "#ff0000"));

      return [
        pass(SELECTIVE_FRAGMENT, {
          u_reds: [params.hue_red, params.sat_red, params.val_red],
          u_yellows: [params.hue_yellow, params.sat_yellow, params.val_yellow],
          u_greens: [params.hue_green, params.sat_green, params.val_green],
          u_cyans: [params.hue_cyan, params.sat_cyan, params.val_cyan],
          u_blues: [params.hue_blue, params.sat_blue, params.val_blue],
          u_magentas: [params.hue_magenta, params.sat_magenta, params.val_magenta],
          u_custom: [params.hue_custom, params.sat_custom, params.val_custom],
          u_customHue: customHsv[0],
          u_useCustom: params.target === "custom",
        }),
      ];
    },
  },
});
