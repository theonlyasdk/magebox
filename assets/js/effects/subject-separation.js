import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const SUBJECT_HEADER = `
  uniform int u_mode; 
  uniform float u_amount; 
  uniform float u_radius; 
  uniform bool u_showBorders; 
  uniform vec2 u_center; 
  uniform float u_softness; 
  uniform int u_blurType; 
  uniform float u_bokehThreshold; 
  uniform float u_bokehBoost; 
  uniform int u_maskType; 
  uniform vec4 u_regions[8]; 
  uniform int u_regionOps[8]; 
  uniform sampler2D u_maskTexture; 
  uniform float u_maskFeather; 
  uniform vec2 u_size; 
  uniform float u_rotation;

  const float PI = 3.14159265;
  const float GOLDEN_ANGLE = 2.39996;

  vec2 rotateVec(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
  }
`;

const SUBJECT_BODY = `
  vec4 color = sampleLinear(v_uv);
  vec2 aspect = vec2(u_outputSize.x / u_outputSize.y, 1.0);
  
  float mask = 0.0;
  float distVal = 0.0; // Normalized distance for border drawing
  float innerEdge = 0.0;
  
  if (u_maskType == 0) {
    // Mode: Radial/Oval Focus
    vec2 rel = (v_uv - u_center) * aspect;
    vec2 rot = rotateVec(rel, u_rotation);
    
    distVal = length(rot / (u_size * u_radius));
    innerEdge = 1.0 - (u_softness / u_radius);
    mask = smoothstep(1.0, innerEdge, distVal);
  } else if (u_maskType == 1) {
    // Mode: Custom Regions
    for (int i = 0; i < 8; i++) {
      int op = u_regionOps[i];
      if (op == 0) continue;
      vec4 rData = u_regions[i];
      float d = distance(v_uv * aspect, rData.xy * aspect);
      float localMask = smoothstep(rData.z, rData.z - rData.w, d);
      if (op == 1) mask = max(mask, localMask);
      else if (op == -1) mask = min(mask, 1.0 - localMask);
    }
  } else {
    // Mode: Freehand Mask
    if (u_maskFeather > 0.0) {
      float mAccum = 0.0;
      vec2 ft = u_texelSize * u_maskFeather;
      mAccum += texture2D(u_maskTexture, v_uv).r * 0.4;
      mAccum += texture2D(u_maskTexture, v_uv + vec2(ft.x, 0.0)).r * 0.15;
      mAccum += texture2D(u_maskTexture, v_uv - vec2(ft.x, 0.0)).r * 0.15;
      mAccum += texture2D(u_maskTexture, v_uv + vec2(0.0, ft.y)).r * 0.15;
      mAccum += texture2D(u_maskTexture, v_uv - vec2(0.0, ft.y)).r * 0.15;
      mask = mAccum;
    } else {
      mask = texture2D(u_maskTexture, v_uv).r;
    }
  }
  
  vec3 result = color.rgb;
  vec2 t = u_texelSize * u_amount * 2.5;

  if (u_mode == 0) {
    if (mask < 0.999) {
      vec3 blurAccum = vec3(0.0);
      float totalWeight = 0.0;
      for (int i = 0; i < 64; i++) {
        float fi = float(i);
        float r = sqrt(fi / 63.0);
        float theta = fi * GOLDEN_ANGLE;
        vec2 offset = vec2(cos(theta), sin(theta)) * r * t;
        vec3 samp = sampleLinear(v_uv + offset).rgb;
        float w = 1.0;
        if (u_blurType == 1) w = exp(-3.0 * r * r);
        else if (u_blurType == 3) {
          float luma = luminance(samp);
          float threshold = min(0.99, u_bokehThreshold);
          float highlight = max(0.0, luma - threshold) / (1.0 - threshold);
          w = 1.0 + pow(highlight, 4.0) * u_bokehBoost;
        }
        blurAccum += samp * w;
        totalWeight += w;
      }
      result = mix(blurAccum / max(0.001, totalWeight), color.rgb, mask);
    }
  } else {
    if (mask > 0.001) {
      vec2 st = u_texelSize * 1.5;
      vec3 avg = (sampleLinear(v_uv + vec2(0.0, st.y)).rgb + sampleLinear(v_uv - vec2(0.0, st.y)).rgb + sampleLinear(v_uv + vec2(st.x, 0.0)).rgb + sampleLinear(v_uv - vec2(st.x, 0.0)).rgb) * 0.25;
      vec3 sharpened = color.rgb + (color.rgb - avg) * u_amount;
      result = mix(color.rgb, sharpened, mask);
    }
  }

  if (u_showBorders) {
    vec3 innerColor = vec3(1.0, 1.0, 0.0); // Yellow for Sharp edge
    vec3 outerColor = vec3(0.0, 1.0, 1.0); // Cyan for Blur edge
    
    if (u_maskType == 0) {
      // Solid border at inner edge (thinner: 0.004)
      float bInner = smoothstep(0.004, 0.0, abs(distVal - innerEdge));
      result = mix(result, innerColor, bInner);
      
      // Dotted border at outer edge (thinner + denser dots)
      float bOuter = smoothstep(0.004, 0.0, abs(distVal - 1.0));
      vec2 rel = (v_uv - u_center) * aspect;
      vec2 rot = rotateVec(rel, u_rotation);
      float angle = atan(rot.y, rot.x);
      // Increased frequency from 12 to 24 for smaller gaps
      float dots = step(0.4, fract(angle * 24.0 / PI));
      result = mix(result, outerColor, bOuter * dots);
    } else {
      // Generic stripes for complex masks
      if (mask > 0.01) {
        float stripes = step(0.5, fract((v_uv.x * aspect.x + v_uv.y) * 20.0));
        result = mix(result, innerColor, mask * stripes * 0.3);
      }
    }
  }

  gl_FragColor = vec4(result, color.a);
`;

const SUBJECT_FRAGMENT = fragmentShaderSource(SUBJECT_HEADER, SUBJECT_BODY);

const cachedMaskCanvases = new Map();

export default createGpuEffect({
  id: "subject-separation",
  name: "Subject Separation",
  icon: "bi-person-bounding-box",
  description: "Isolates a subject to apply selective blur or sharpening.",
  params: [
    {
      key: "maskType",
      label: "Mask Type",
      type: "select",
      options: [
        { label: "Radial Focus", value: "0" },
        { label: "Custom Regions", value: "1" },
        { label: "Freehand Mask", value: "2" },
      ],
    },
    {
      key: "mode",
      label: "Effect Mode",
      type: "select",
      options: [
        { label: "Blur Background", value: "0" },
        { label: "Sharpen Subject", value: "1" },
      ],
    },
    {
      key: "blurType",
      label: "Blur Type",
      type: "select",
      show_on: { key: "mode", value: "0" },
      options: [
        { label: "Box", value: "0" },
        { label: "Gaussian", value: "1" },
        { label: "Lens", value: "2" },
        { label: "Portrait (Bokeh)", value: "3" },
      ],
    },
    { 
      key: "centerX", 
      label: "Center X", 
      type: "range", 
      min: 0, max: 1, step: 0.01,
      show_on: { key: "maskType", value: "0" },
      interactive: true
    },
    { 
      key: "centerY", 
      label: "Center Y", 
      type: "range", 
      min: 0, max: 1, step: 0.01,
      show_on: { key: "maskType", value: "0" },
      interactive: true
    },
    { 
      key: "width", 
      label: "Width", 
      type: "range", 
      min: 0.1, max: 2.0, step: 0.01,
      show_on: { key: "maskType", value: "0" }
    },
    { 
      key: "height", 
      label: "Height", 
      type: "range", 
      min: 0.1, max: 2.0, step: 0.01,
      show_on: { key: "maskType", value: "0" }
    },
    { 
      key: "rotation", 
      label: "Rotation", 
      type: "range", 
      min: -180, max: 180, step: 1, unit: "°",
      show_on: { key: "maskType", value: "0" }
    },
    { 
      key: "radius", 
      label: "Focus Scale", 
      type: "range", 
      min: 0.05, max: 1.0, step: 0.01,
      show_on: { key: "maskType", value: "0" }
    },
    { 
      key: "softness", 
      label: "Focus Softness", 
      type: "range", 
      min: 0.01, max: 0.5, step: 0.01,
      show_on: { key: "maskType", value: "0" }
    },
    {
      key: "regions",
      label: "Regions",
      type: "regions",
      show_on: { key: "maskType", value: "1" }
    },
    {
      key: "freehandMask",
      label: "Draw Mask",
      type: "mask",
      show_on: { key: "maskType", value: "2" }
    },
    {
      key: "maskFeather",
      label: "Mask Feather",
      type: "range",
      min: 0,
      max: 20,
      step: 0.5,
      show_on: { key: "maskType", value: "2" }
    },
    { key: "amount", label: "Effect Strength", type: "range", min: 0, max: 20, step: 0.1 },
    { 
      key: "bokehThreshold", 
      label: "Bokeh Threshold", 
      type: "range", 
      min: 0, 
      max: 1, 
      step: 0.01,
      show_on: { key: "blurType", value: "3" }
    },
    { 
      key: "bokehBoost", 
      label: "Bokeh Boost", 
      type: "range", 
      min: 0, 
      max: 100, 
      step: 0.5,
      show_on: { key: "blurType", value: "3" }
    },
    { 
      key: "showBorders", 
      label: "Inspection", 
      type: "switch", 
      description: "Show subject area" 
    },
  ],
  defaultParams: { 
    maskType: "0",
    mode: "0", 
    blurType: "3", 
    centerX: 0.5,
    centerY: 0.5,
    width: 1.0,
    height: 1.0,
    rotation: 0,
    radius: 0.35, 
    softness: 0.2, 
    amount: 10.0, 
    bokehThreshold: 0.5, 
    bokehBoost: 40.0, 
    showBorders: false,
    regions: [{ x: 0.5, y: 0.5, r: 0.3, s: 0.1, op: 1 }],
    freehandMask: null,
    maskFeather: 5.0
  },
  render: {
    passes(params) {
      const regionData = new Float32Array(8 * 4);
      const regionOps = new Int32Array(8);
      const regions = Array.isArray(params.regions) ? params.regions : [];
      for (let i = 0; i < 8; i++) {
        if (i < regions.length) {
          const r = regions[i];
          regionData[i * 4 + 0] = r.x;
          regionData[i * 4 + 1] = 1.0 - r.y;
          regionData[i * 4 + 2] = r.r;
          regionData[i * 4 + 3] = r.s;
          regionOps[i] = r.op;
        } else { regionOps[i] = 0; }
      }

      let maskTexture = params.freehandMask;
      if (typeof maskTexture === 'string') {
        const maskKey = 'subject-separation-freehandMask';
        if (cachedMaskCanvases.has(maskKey)) {
          maskTexture = cachedMaskCanvases.get(maskKey);
          if (maskTexture._lastData !== params.freehandMask) {
            maskTexture._lastData = params.freehandMask;
            const img = new Image();
            img.onload = () => {
              const ctx = maskTexture.getContext('2d');
              ctx.clearRect(0, 0, maskTexture.width, maskTexture.height);
              ctx.drawImage(img, 0, 0);
              if (typeof requestRender === 'function') requestRender();
            };
            img.src = params.freehandMask;
          }
        } else {
          const cvs = document.createElement('canvas');
          cvs._lastData = params.freehandMask;
          const img = new Image();
          img.onload = () => {
            cvs.width = img.naturalWidth;
            cvs.height = img.naturalHeight;
            cvs.getContext('2d').drawImage(img, 0, 0);
            if (typeof requestRender === 'function') requestRender();
          };
          img.src = params.freehandMask;
          cachedMaskCanvases.set(maskKey, cvs);
          maskTexture = cvs;
        }
      }

      if (!maskTexture) {
        maskTexture = document.createElement('canvas');
        maskTexture.width = 1; maskTexture.height = 1;
      }

      return [
        pass(SUBJECT_FRAGMENT, {
          u_maskType: parseInt(params.maskType ?? "0"),
          u_mode: parseInt(params.mode ?? "0"),
          u_blurType: parseInt(params.blurType ?? "3"),
          u_amount: Number(params.amount ?? 10.0),
          u_radius: Number(params.radius ?? 0.35),
          u_size: [Number(params.width ?? 1.0), Number(params.height ?? 1.0)],
          u_rotation: (Number(params.rotation ?? 0) * Math.PI) / 180,
          u_softness: Number(params.softness ?? 0.2),
          u_bokehThreshold: Number(params.bokehThreshold ?? 0.5),
          u_bokehBoost: Number(params.bokehBoost ?? 40.0),
          u_showBorders: Boolean(params.showBorders),
          u_center: [Number(params.centerX ?? 0.5), 1.0 - Number(params.centerY ?? 0.5)],
          u_regions: regionData,
          u_regionOps: regionOps,
          u_maskFeather: Number(params.maskFeather ?? 5.0),
        }, {
          luts: { u_maskTexture: maskTexture }
        }),
      ];
    },
  },
});
