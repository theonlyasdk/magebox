import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const FRESNEL_FRAGMENT = fragmentShaderSource(
  `
  uniform vec3 u_color;
  uniform float u_intensity;
  uniform float u_power;
  uniform float u_bias;
  uniform float u_depth;
  uniform float u_thickness;
  `,
  `
  vec4 baseColor = sampleLinear(v_uv);
  
  // Approximate normals from luminance gradient
  vec2 t = u_texelSize * u_thickness;
  float l = luminance(baseColor.rgb);
  float lx = luminance(sampleLinear(v_uv + vec2(t.x, 0.0)).rgb);
  float ly = luminance(sampleLinear(v_uv + vec2(0.0, t.y)).rgb);
  
  float dx = (l - lx);
  float dy = (l - ly);
  
  // Create normal vector. u_depth controls how 'flat' or 'bumpy' it looks
  vec3 normal = normalize(vec3(dx, dy, 1.0 / max(0.01, u_depth)));
  
  // Fresnel calculation: 1.0 - dot(normal, viewDirection)
  // View direction is straight at the camera: vec3(0, 0, 1)
  // So it's just 1.0 - normal.z
  float fresnel = pow(clamp(1.0 - normal.z + u_bias, 0.0, 1.0), u_power);
  
  vec3 rim = u_color * fresnel * u_intensity;
  
  // Additive blend for the glow
  gl_FragColor = vec4(baseColor.rgb + rim, baseColor.a);
`,
);

export default defineGpuEffect({
  id: "fresnel",
  name: "Fresnel Rim Light",
  icon: "bi-sun",
  description: "Adds a glowing rim light to the edges of subjects based on image depth.",
  params: [
    { key: "color", label: "Rim Color", type: "color" },
    { key: "intensity", label: "Intensity", type: "range", min: 0, max: 5, step: 0.1 },
    { key: "power", label: "Sharpness", type: "range", min: 0.1, max: 10, step: 0.1 },
    { key: "bias", label: "Bias", type: "range", min: -1, max: 1, step: 0.01 },
    { key: "depth", label: "Surface Depth", type: "range", min: 0.1, max: 50, step: 0.1 },
    { key: "thickness", label: "Edge Search", type: "range", min: 0.5, max: 10, step: 0.1, unit: "px" },
  ],
  defaultParams: {
    color: "#ffffff",
    intensity: 1.5,
    power: 3.0,
    bias: 0.0,
    depth: 10.0,
    thickness: 2.0
  },
  gl: {
    isNeutral(params) {
      return Number(params.intensity ?? 0) <= 0;
    },
    passes(params) {
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
      };

      return [
        pass(FRESNEL_FRAGMENT, {
          u_color: hexToRgb(params.color ?? "#ffffff"),
          u_intensity: Number(params.intensity ?? 1.5),
          u_power: Number(params.power ?? 3.0),
          u_bias: Number(params.bias ?? 0.0),
          u_depth: Number(params.depth ?? 10.0),
          u_thickness: Number(params.thickness ?? 2.0),
        }),
      ];
    },
  },
});
