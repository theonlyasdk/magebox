import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const SHARPEN_FRAGMENT = fragmentShaderSource(
  `
  uniform float u_amount;
  uniform float u_radius;
  uniform int u_type;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  vec2 t = u_texelSize * u_radius;
  
  // Sample neighborhood (cross)
  vec3 n = sampleLinear(v_uv + vec2(0.0, -t.y)).rgb;
  vec3 s = sampleLinear(v_uv + vec2(0.0, t.y)).rgb;
  vec3 w = sampleLinear(v_uv + vec2(-t.x, 0.0)).rgb;
  vec3 e = sampleLinear(v_uv + vec2(t.x, 0.0)).rgb;
  
  vec3 avg = (n + s + w + e) * 0.25;
  vec3 result;

  if (u_type == 0) {
    // Standard Sharpen
    result = color.rgb + (color.rgb - avg) * u_amount;
  } else if (u_type == 1) {
    // Adaptive / Unsharp Mask (3x3 box approximation)
    vec3 nw = sampleLinear(v_uv + vec2(-t.x, -t.y)).rgb;
    vec3 ne = sampleLinear(v_uv + vec2(t.x, -t.y)).rgb;
    vec3 sw = sampleLinear(v_uv + vec2(-t.x, t.y)).rgb;
    vec3 se = sampleLinear(v_uv + vec2(t.x, t.y)).rgb;
    vec3 avgAll = (n + s + w + e + nw + ne + sw + se + color.rgb) / 9.0;
    result = color.rgb + (color.rgb - avgAll) * u_amount;
  } else if (u_type == 2) {
    // Luminance Only (avoids color fringing)
    float l = luminance(color.rgb);
    float ln = luminance(n);
    float ls = luminance(s);
    float lw = luminance(w);
    float le = luminance(e);
    float lAvg = (ln + ls + lw + le) * 0.25;
    result = color.rgb + (l - lAvg) * u_amount;
  } else {
    // High Pass Style
    result = vec3(0.5) + (color.rgb - avg) * u_amount;
  }

  gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
`,
);

export default createGpuEffect({
  id: "sharpen",
  name: "Sharpen",
  icon: "bi-triangle",
  description: "Enhances image details and edges using various sharpening techniques.",
  params: [
    {
      key: "type",
      label: "Method",
      type: "select",
      options: [
        { label: "Standard", value: "0" },
        { label: "Adaptive (Unsharp)", value: "1" },
        { label: "Luminance Only", value: "2" },
        { label: "High Pass", value: "3" },
      ],
    },
    { key: "amount", label: "Amount", type: "range", min: 0, max: 5, step: 0.05 },
    { key: "radius", label: "Radius", type: "range", min: 0.1, max: 5, step: 0.1, unit: "px" },
  ],
  defaultParams: { type: "0", amount: 1.0, radius: 1.0 },
  render: {
    isNeutral(params) {
      return Number(params.amount ?? 0) <= 0;
    },
    passes(params) {
      const amount = Number(params.amount ?? 1.0);
      if (amount <= 0) return [];
      return [
        pass(SHARPEN_FRAGMENT, {
          u_type: parseInt(params.type ?? "0"),
          u_amount: amount,
          u_radius: Number(params.radius ?? 1.0),
        }),
      ];
    },
  },
});
