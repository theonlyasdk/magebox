import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const HALFTONE_HEADER = `
  uniform float u_size; 
  uniform float u_angle; 
  uniform float u_intensity; 
  uniform int u_mode;

  vec2 rotate(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
  }

  float getDot(vec2 st, float size, float angle, float luma, float intensity) {
    vec2 rot = rotate(st, angle);
    vec2 nearest = floor(rot / size) * size + size * 0.5;
    float dist = length(rot - nearest);
    float radius = (1.0 - luma) * size * 0.75 * intensity;
    return smoothstep(radius, radius - 1.5, dist);
  }
`;

const HALFTONE_BODY = `
  vec2 pixel = v_uv * u_outputSize;
  vec4 color = sampleLinear(v_uv);
  
  if (u_mode == 0) {
    // Monochrome
    float luma = luminance(color.rgb);
    float dot = getDot(pixel, u_size, u_angle, luma, u_intensity);
    gl_FragColor = vec4(vec3(dot), color.a);
  } else {
    // Stylized Color (Offset CMYK-like)
    float dotR = getDot(pixel, u_size, u_angle + 0.26, color.r, u_intensity);
    float dotG = getDot(pixel, u_size, u_angle + 0.52, color.g, u_intensity);
    float dotB = getDot(pixel, u_size, u_angle + 0.78, color.b, u_intensity);
    gl_FragColor = vec4(dotR, dotG, dotB, color.a);
  }
`;

const HALFTONE_FRAGMENT = fragmentShaderSource(HALFTONE_HEADER, HALFTONE_BODY);

export default defineGpuEffect({
  id: "halftone",
  name: "Halftone",
  icon: "bi-grid-3x3-gap-fill",
  description: "Simulates a vintage printed halftone pattern.",
  controls: [
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [
        { label: "Monochrome", value: "0" },
        { label: "Color", value: "1" },
      ],
    },
    { key: "size", label: "Dot Size", type: "range", min: 2, max: 50, step: 0.5, unit: "px" },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 90, step: 1, unit: "°" },
    { key: "intensity", label: "Intensity", type: "range", min: 0, max: 2, step: 0.01 },
  ],
  defaultParams: { mode: "0", size: 8, angle: 45, intensity: 1.0 },
  gl: {
    passes(params) {
      return [
        pass(HALFTONE_FRAGMENT, {
          u_mode: parseInt(params.mode ?? "0"),
          u_size: Number(params.size ?? 8),
          u_angle: (Number(params.angle ?? 45) * Math.PI) / 180,
          u_intensity: Number(params.intensity ?? 1.0),
        }),
      ];
    },
  },
});
