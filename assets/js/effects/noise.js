import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const NOISE_FUNCTIONS = `
  uniform float u_amount; 
  uniform float u_seed; 
  uniform int u_type; 
  uniform float u_density; 
  uniform float u_scale; 
  uniform bool u_monochrome;
  uniform float u_blend;

  vec3 hash3(vec2 p) {
    vec3 q = vec3(dot(p, vec2(127.1, 311.7)), 
                  dot(p, vec2(269.5, 183.3)), 
                  dot(p, vec2(419.2, 371.9)));
    return fract(sin(q + u_seed) * 43758.5453);
  }

  float hash1(vec2 p) {
    return fract(sin(dot(p + u_seed, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float a = hash1(i);
    float b = hash1(i + vec2(1.0, 0.0));
    float c = hash1(i + vec2(0.0, 1.0));
    float d = hash1(i + vec2(1.0, 1.0));
    return mix(a, b, f.x) + (c - a)*f.y*(1.0-f.x) + (d - b)*f.x*f.y;
  }
`;

const NOISE_FRAGMENT = fragmentShaderSource(
  NOISE_FUNCTIONS,
  `
  vec4 color = sampleLinear(v_uv);
  vec3 result = color.rgb;
  
  vec2 st = v_uv * u_scale;
  if (u_type == 2) st = floor(st); // Block noise
  
  vec3 n;
  if (u_type == 3) {
    float vn = valueNoise(st);
    n = vec3(vn);
  } else {
    n = u_monochrome ? vec3(hash1(st)) : hash3(st);
  }

  if (u_type == 1) {
    // Salt & Pepper
    float threshold = u_density * 0.5;
    vec3 target = result;
    if (n.r < threshold) target = vec3(0.0);
    else if (n.r > 1.0 - threshold) target = vec3(1.0);
    
    // Apply amount and blend
    result = mix(result, target, u_amount);
    result = mix(target, result, u_blend);
  } else {
    // White / Block / Value
    float mask = step(1.0 - u_density, hash1(st + 0.1));
    vec3 noiseOffset = (n - 0.5) * u_amount * mask;
    
    // Apply blend to the noise intensity
    result += noiseOffset * (1.0 - u_blend * 0.5);
  }

  gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
`,
);

export default defineGpuEffect({
  id: "noise",
  name: "Noise",
  icon: "bi-reception-4",
  description: "Adds different types of procedural noise and grain.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { label: "White", value: "0" },
        { label: "Salt & Pepper", value: "1" },
        { label: "Block", value: "2" },
        { label: "Value (Soft)", value: "3" },
      ],
    },
    { key: "amount", label: "Amount", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "density", label: "Density", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "blend", label: "Blend", type: "range", min: 0, max: 100, step: 1, unit: "%" },
    { key: "scale", label: "Scale", type: "range", min: 1, max: 1000, step: 1, show_on: { key: "type", value: "2" } },
    { key: "scale_vn", label: "Scale", type: "range", min: 1, max: 200, step: 1, show_on: { key: "type", value: "3" } },
    { key: "monochrome", label: "Monochrome", type: "range", min: 0, max: 1, step: 1 },
    { key: "seed", label: "Seed", type: "range", min: 0, max: 100, step: 1 },
  ],
  defaultParams: { 
    type: "0", 
    amount: 0.1, 
    density: 1.0, 
    blend: 0,
    scale: 50, 
    scale_vn: 20,
    monochrome: 1, 
    seed: 0 
  },
  gl: {
    isNeutral(params) {
      const amount = Number(params.amount ?? 0);
      const density = Number(params.density ?? 1.0);
      return amount <= 0 || density <= 0;
    },
    passes(params) {
      const type = parseInt(params.type ?? "0");
      const scale = Number(params.type === "2" ? params.scale : params.scale_vn);

      return [
        pass(NOISE_FRAGMENT, {
          u_type: type,
          u_amount: Number(params.amount ?? 0.1),
          u_density: Number(params.density ?? 1.0),
          u_blend: Number(params.blend ?? 0) / 100,
          u_scale: type >= 2 ? scale : 1.0,
          u_monochrome: Number(params.monochrome ?? 1) === 1,
          u_seed: Number(params.seed ?? 0),
        }),
      ];
    },
  },
});
