import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";
import { generateSplineLUT } from "../utils/math.js";

const CURVES_FRAGMENT = fragmentShaderSource(
  `
  uniform sampler2D u_lutMaster;
  uniform sampler2D u_lutR;
  uniform sampler2D u_lutG;
  uniform sampler2D u_lutB;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  
  // 1. Apply RGB curves
  float r = texture2D(u_lutR, vec2(color.r, 0.5)).r;
  float g = texture2D(u_lutG, vec2(color.g, 0.5)).r;
  float b = texture2D(u_lutB, vec2(color.b, 0.5)).r;
  
  // 2. Apply Master curve
  r = texture2D(u_lutMaster, vec2(r, 0.5)).r;
  g = texture2D(u_lutMaster, vec2(g, 0.5)).r;
  b = texture2D(u_lutMaster, vec2(b, 0.5)).r;
  
  gl_FragColor = vec4(r, g, b, color.a);
`,
);

export default defineGpuEffect({
  id: "curves",
  name: "Curves",
  icon: "bi-graph-up",
  description: "Advanced color mapping using curves.",
  params: [
    { 
      key: "master", 
      label: "Master", 
      type: "curves", 
      default: [[0, 0], [1, 1]],
      color: "#ffffff"
    },
    { 
      key: "red", 
      label: "Red", 
      type: "curves", 
      default: [[0, 0], [1, 1]],
      color: "#ff4d4d"
    },
    { 
      key: "green", 
      label: "Green", 
      type: "curves", 
      default: [[0, 0], [1, 1]],
      color: "#4dff4d"
    },
    { 
      key: "blue", 
      label: "Blue", 
      type: "curves", 
      default: [[0, 0], [1, 1]],
      color: "#4d4dff"
    },
  ],
  defaultParams: {
    master: [[0, 0], [1, 1]],
    red: [[0, 0], [1, 1]],
    green: [[0, 0], [1, 1]],
    blue: [[0, 0], [1, 1]],
  },
  gl: {
    isNeutral(params) {
      const isDefault = (points) => {
        if (!points || points.length !== 2) return false;
        return points[0][0] === 0 && points[0][1] === 0 && points[1][0] === 1 && points[1][1] === 1;
      };
      return isDefault(params.master) && isDefault(params.red) && isDefault(params.green) && isDefault(params.blue);
    },
    passes(params) {
      return [
        pass(CURVES_FRAGMENT, {}, {
          luts: { 
            u_lutMaster: generateSplineLUT(params.master || [[0, 0], [1, 1]]),
            u_lutR: generateSplineLUT(params.red || [[0, 0], [1, 1]]),
            u_lutG: generateSplineLUT(params.green || [[0, 0], [1, 1]]),
            u_lutB: generateSplineLUT(params.blue || [[0, 0], [1, 1]]),
          }
        }),
      ];
    },
  },
});
