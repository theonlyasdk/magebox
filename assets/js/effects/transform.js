import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const TRANSFORM_FRAGMENT = fragmentShaderSource(
  `
  uniform vec2 u_translate;
  uniform vec2 u_scale;
  uniform vec2 u_skew;
  uniform vec2 u_anchor;
  uniform float u_rotation;
  uniform float u_flipX;
  uniform float u_flipY;
  `,
  `
  vec2 outPx = v_uv * u_outputSize;
  vec2 pivot = u_anchor * u_inputSize;
  vec2 p = outPx - pivot - u_translate;

  float sx = max(abs(u_scale.x), 0.0001) * (u_flipX > 0.5 ? -1.0 : 1.0);
  float sy = max(abs(u_scale.y), 0.0001) * (u_flipY > 0.5 ? -1.0 : 1.0);
  float skx = tan(radians(u_skew.x));
  float sky = tan(radians(u_skew.y));
  float c = cos(u_rotation);
  float s = sin(u_rotation);

  float a = c * sx - s * sky * sx;
  float b = c * skx * sy - s * sy;
  float c2 = s * sx + c * sky * sx;
  float d = s * skx * sy + c * sy;
  float det = a * d - b * c2;

  vec2 local = p;
  if (abs(det) > 0.000001) {
    float inv = 1.0 / det;
    mat2 invM = mat2(d, -b, -c2, a) * inv;
    local = invM * p;
  }

  vec2 uv = (local + pivot) / u_inputSize;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0);
    return;
  }
  gl_FragColor = sampleLinear(uv);
`,
);

export default createGpuEffect({
  id: "transform",
  name: "Transform",
  icon: "bi-arrows-move",
  description: "Moves, rotates, scales, skews, and flips the active layer.",
  params: [
    { key: "offsetX", label: "Offset X", type: "range", min: -2000, max: 2000, step: 1, unit: "px" },
    { key: "offsetY", label: "Offset Y", type: "range", min: -2000, max: 2000, step: 1, unit: "px" },
    { key: "rotation", label: "Rotate", type: "range", min: -180, max: 180, step: 1, unit: "°" },
    { key: "scaleX", label: "Scale X", type: "range", min: 0.05, max: 4, step: 0.01 },
    { key: "scaleY", label: "Scale Y", type: "range", min: 0.05, max: 4, step: 0.01 },
    { key: "skewX", label: "Skew X", type: "range", min: -89, max: 89, step: 1, unit: "°" },
    { key: "skewY", label: "Skew Y", type: "range", min: -89, max: 89, step: 1, unit: "°" },
    { key: "anchorX", label: "Anchor X", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "anchorY", label: "Anchor Y", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "flipX", label: "Flip X", type: "switch", description: "Mirror horizontally" },
    { key: "flipY", label: "Flip Y", type: "switch", description: "Mirror vertically" },
  ],
  defaultParams: {
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    anchorX: 0.5,
    anchorY: 0.5,
    flipX: false,
    flipY: false,
  },
  render: {
    isNeutral(params) {
      return (
        Number(params.offsetX ?? 0) === 0 &&
        Number(params.offsetY ?? 0) === 0 &&
        Number(params.rotation ?? 0) === 0 &&
        Number(params.scaleX ?? 1) === 1 &&
        Number(params.scaleY ?? 1) === 1 &&
        Number(params.skewX ?? 0) === 0 &&
        Number(params.skewY ?? 0) === 0 &&
        !params.flipX &&
        !params.flipY
      );
    },
    passes(params) {
      if (this.isNeutral(params)) return [];

      return [
        pass(TRANSFORM_FRAGMENT, {
          u_translate: [Number(params.offsetX ?? 0), -Number(params.offsetY ?? 0)],
          u_scale: [Number(params.scaleX ?? 1), Number(params.scaleY ?? 1)],
          u_skew: [Number(params.skewX ?? 0), Number(params.skewY ?? 0)],
          u_anchor: [Number(params.anchorX ?? 0.5), 1.0 - Number(params.anchorY ?? 0.5)],
          u_rotation: -(Number(params.rotation ?? 0) * Math.PI) / 180,
          u_flipX: params.flipX ? 1 : 0,
          u_flipY: params.flipY ? 1 : 0,
        }),
      ];
    },
  },
});
