import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const LIGHT_FRAGMENT = fragmentShaderSource(
  `
  uniform vec4 u_lights[8]; // x, y, radius, intensity
  uniform vec3 u_colors[8]; // rgb
  uniform int u_lightCount;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  vec3 result = color.rgb;
  
  vec2 aspect = vec2(u_outputSize.x / u_outputSize.y, 1.0);
  
  for (int i = 0; i < 8; i++) {
    if (i >= u_lightCount) break;
    
    vec4 lData = u_lights[i];
    vec3 lCol = u_colors[i];
    
    float d = distance(v_uv * aspect, lData.xy * aspect);
    
    // Smooth radial falloff
    float falloff = 1.0 - smoothstep(0.0, lData.z, d);
    falloff *= falloff;
    
    // Additive glow
    result += lCol * falloff * lData.w;
  }
  
  gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
`,
);

export default createGpuEffect({
  id: "light-source",
  name: "Light Source",
  icon: "bi-lightbulb",
  description: "Adds interactive glow and lighting effects to the image.",
  params: [
    {
      key: "lights",
      label: "Light Sources",
      type: "lights",
    }
  ],
  defaultParams: { 
    lights: [
      { x: 0.5, y: 0.5, radius: 0.4, intensity: 0.8, color: "#ffffff" }
    ]
  },
  render: {
    passes(params) {
      const lights = Array.isArray(params.lights) ? params.lights : [];
      const lightData = new Float32Array(8 * 4);
      const colorData = new Float32Array(8 * 3);
      
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
      };

      for (let i = 0; i < 8; i++) {
        if (i < lights.length) {
          const l = lights[i];
          lightData[i * 4 + 0] = l.x;
          lightData[i * 4 + 1] = l.y;
          lightData[i * 4 + 2] = l.radius;
          lightData[i * 4 + 3] = l.intensity;
          
          const rgb = hexToRgb(l.color || "#ffffff");
          colorData[i * 3 + 0] = rgb[0];
          colorData[i * 3 + 1] = rgb[1];
          colorData[i * 3 + 2] = rgb[2];
        }
      }

      return [
        pass(LIGHT_FRAGMENT, {
          u_lights: lightData,
          u_colors: colorData,
          u_lightCount: lights.length,
        }),
      ];
    },
  },
});
