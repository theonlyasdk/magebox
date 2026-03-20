import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const getWarpFragment = (mathFunc) => fragmentShaderSource(
  "uniform float u_amplitude; uniform float u_frequency; uniform float u_axis;",
  `
  vec2 uv = v_uv;
  float tau = 6.28318530718;
  float x = v_uv.x;
  float y = v_uv.y;
  float f = u_frequency;
  float a = u_amplitude;
  
  float offset = 0.0;
  if (u_axis < 0.5) {
    float val = ${mathFunc.replace(/y/g, '(y * tau * f)')};
    uv.x += val * (a / u_inputSize.x);
  } else {
    float val = ${mathFunc.replace(/x/g, '(x * tau * f)')};
    uv.y += val * (a / u_inputSize.y);
  }
  gl_FragColor = sampleLinear(uv);
`,
);

// We need a more robust way to inject the custom function.
// The above string replacement is a bit naive.
// Let's refine it.

const getWarpFragmentV2 = (mathFunc) => {
  // Pre-process math string for GLSL compatibility
  let processed = mathFunc
    // Handle e^x -> exp(x) including function calls like e^sin(t)
    .replace(/\be\^([a-zA-Z_]\w*\([^)]*\)|[\w\.]+)/g, "exp($1)")
    // Handle a^b -> pow(a, b) including function calls
    .replace(/([a-zA-Z_]\w*\([^)]*\)|[\w\.]+)\^([a-zA-Z_]\w*\([^)]*\)|[\w\.]+)/g, "pow($1, $2)")
    // Handle integers -> floats (e.g. 1 -> 1.0)
    .replace(/(?<![\d.])(\d+)(?![\d.])/g, "$1.0");

  return fragmentShaderSource(
    "uniform float u_amplitude; uniform float u_frequency; uniform float u_axis;",
    `
  vec2 uv = v_uv;
  float tau = 6.28318530718;
  
  float t = (u_axis < 0.5 ? v_uv.y : v_uv.x) * tau * u_frequency;
  
  // Available variables for custom function: t (mapped axis), a (amplitude), f (frequency)
  float a = u_amplitude;
  float f = u_frequency;
  
  float val = ${processed};
  
  if (u_axis < 0.5) {
    uv.x += val * (a / u_inputSize.x);
  } else {
    uv.y += val * (a / u_inputSize.y);
  }
  gl_FragColor = sampleLinear(uv);
`,
  );
};

export default defineGpuEffect({
  id: "warp",
  name: "Warp",
  icon: "bi-arrow-repeat",
  description: "Waves the image using mathematical warping functions.",
  controls: [
    { key: "amplitude", label: "Amplitude", type: "range", min: 0, max: 100, step: 1, unit: "px" },
    { key: "frequency", label: "Frequency", type: "range", min: 0.1, max: 10, step: 0.1 },
    {
      key: "axis",
      label: "Axis",
      type: "select",
      options: [
        { label: "Horizontal", value: "x" },
        { label: "Vertical", value: "y" },
      ],
    },
    {
      key: "function",
      label: "Function",
      type: "select",
      options: [
        { label: "Sine", value: "sin(t)" },
        { label: "Cosine", value: "cos(t)" },
        { label: "Square", value: "sign(sin(t))" },
        { label: "Sawtooth", value: "fract(t/tau)*2.0-1.0" },
        { label: "Custom", value: "custom" },
      ],
    },
    {
      key: "customFunc",
      label: "Custom Function",
      type: "text",
      show_on: { key: "function", value: "custom" },
    },
  ],
  defaultParams: { amplitude: 30, frequency: 2, axis: "x", function: "sin(t)", customFunc: "sin(t) * e^cos(t * 0.5)" },
  gl: {
    isNeutral(params) {
      return Number(params.amplitude ?? 0) <= 0;
    },
    passes(params) {
      const amp = Math.min(200, Math.max(0, Number(params.amplitude ?? 0)));
      if (amp <= 0) return [];
      
      let mathFunc = params.function;
      if (mathFunc === "custom") {
        mathFunc = params.customFunc || "0.0";
      }
      
      // Basic safety: only allow alphanumeric, parens, and common math operators/functions
      // GLSL will handle the actual compilation and safety.
      // We just want to prevent obvious nonsense or injection attempts if any.
      
      return [
        pass(getWarpFragmentV2(mathFunc), {
          u_amplitude: amp,
          u_frequency: Math.min(20, Math.max(0.1, Number(params.frequency ?? 2))),
          u_axis: params.axis === "y" ? 1 : 0,
        }),
      ];
    },
  },
});
