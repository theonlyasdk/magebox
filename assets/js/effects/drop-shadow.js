import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

function hexToRgb(hex) {
  const value = String(hex ?? "#000000").trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(value);
  if (!match) return [0, 0, 0];
  return [
    parseInt(match[1].slice(0, 2), 16) / 255,
    parseInt(match[1].slice(2, 4), 16) / 255,
    parseInt(match[1].slice(4, 6), 16) / 255,
  ];
}

const DROP_SHADOW_FRAGMENT = fragmentShaderSource(
  `
  uniform vec2 u_offset;
  uniform vec3 u_color;
  uniform float u_opacity;
  uniform float u_blur;
  uniform float u_spread;
  uniform int u_matteMode;
  uniform float u_matteThreshold;
  uniform float u_matteSoftness;
  uniform float u_dither;

  vec4 sampleTransparent(vec2 uv) {
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
      return vec4(0.0);
    }
    return texture2D(u_texture, uv);
  }

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec3 borderColor(int idx) {
    if (idx == 0) return sampleTransparent(vec2(0.02, 0.02)).rgb;
    if (idx == 1) return sampleTransparent(vec2(0.20, 0.02)).rgb;
    if (idx == 2) return sampleTransparent(vec2(0.40, 0.02)).rgb;
    if (idx == 3) return sampleTransparent(vec2(0.60, 0.02)).rgb;
    if (idx == 4) return sampleTransparent(vec2(0.80, 0.02)).rgb;
    if (idx == 5) return sampleTransparent(vec2(0.98, 0.02)).rgb;
    if (idx == 6) return sampleTransparent(vec2(0.98, 0.20)).rgb;
    if (idx == 7) return sampleTransparent(vec2(0.98, 0.40)).rgb;
    if (idx == 8) return sampleTransparent(vec2(0.98, 0.60)).rgb;
    if (idx == 9) return sampleTransparent(vec2(0.98, 0.80)).rgb;
    if (idx == 10) return sampleTransparent(vec2(0.98, 0.98)).rgb;
    if (idx == 11) return sampleTransparent(vec2(0.80, 0.98)).rgb;
    if (idx == 12) return sampleTransparent(vec2(0.60, 0.98)).rgb;
    if (idx == 13) return sampleTransparent(vec2(0.40, 0.98)).rgb;
    if (idx == 14) return sampleTransparent(vec2(0.20, 0.98)).rgb;
    return sampleTransparent(vec2(0.02, 0.98)).rgb;
  }

  float minBorderDistance(vec3 c) {
    float minDist = 10.0;
    for (int i = 0; i < 16; i++) {
      vec3 b = borderColor(i);
      float d = distance(c, b);
      minDist = min(minDist, d);
    }
    return minDist;
  }

  float localContrast(vec2 uv, vec3 c) {
    vec2 t = u_texelSize;
    vec3 cx = sampleTransparent(uv + vec2(t.x, 0.0)).rgb;
    vec3 cy = sampleTransparent(uv + vec2(0.0, t.y)).rgb;
    vec3 cxy = sampleTransparent(uv + vec2(t.x, t.y)).rgb;
    return max(distance(c, cx), max(distance(c, cy), distance(c, cxy)));
  }

  float matteAt(vec2 uv) {
    vec4 c = sampleTransparent(uv);
    float alpha = c.a;
    if (u_matteMode == 0) return alpha;
    if (alpha <= 0.0001) return 0.0;

    float dist = minBorderDistance(c.rgb);
    float edge = localContrast(uv, c.rgb);
    float soft = max(0.0001, u_matteSoftness);
    float distMask = smoothstep(u_matteThreshold, u_matteThreshold + soft, dist);
    float edgeMask = smoothstep(0.03, 0.18, edge);
    float autoMask = max(distMask, edgeMask * 0.55);
    autoMask *= alpha;

    if (u_matteMode == 1) return autoMask;
    // Hybrid: preserve true transparency, but avoid rectangular matte on fully opaque sources.
    float isOpaque = step(0.999, alpha);
    return mix(alpha, autoMask, isOpaque);
  }
  `,
  `
  vec4 base = sampleLinear(v_uv);
  vec2 offsetUv = u_offset * u_texelSize;
  vec2 shadowUv = v_uv - offsetUv;

  float blurRadius = max(u_blur, 0.0);
  float spreadRadius = max(u_spread, 0.0);
  float sampleStep = max(1.0, 0.75 + spreadRadius * 0.35);
  float sigma = max(0.5, blurRadius * 0.33 + spreadRadius * 0.25);
  float twoSigmaSq = 2.0 * sigma * sigma;
  float alphaSum = 0.0;
  float weightSum = 0.0;

  // 13x13 Gaussian kernel over the alpha silhouette.
  for (int y = -6; y <= 6; y++) {
    for (int x = -6; x <= 6; x++) {
      vec2 tap = vec2(float(x), float(y)) * u_texelSize * sampleStep;
      float distSq = float(x * x + y * y) * sampleStep * sampleStep;
      float weight = exp(-distSq / twoSigmaSq);
      alphaSum += matteAt(shadowUv + tap) * weight;
      weightSum += weight;
    }
  }

  float shadowAlpha = alphaSum / max(weightSum, 0.0001);
  if (u_dither > 0.0) {
    float n = hash12(v_uv * u_outputSize);
    shadowAlpha += ((n - 0.5) / 255.0) * u_dither;
  }
  shadowAlpha = clamp(shadowAlpha * u_opacity, 0.0, 1.0);
  vec4 shadow = vec4(u_color, shadowAlpha);

  float outAlpha = base.a + shadow.a * (1.0 - base.a);
  vec3 outRgb = vec3(0.0);
  if (outAlpha > 0.0001) {
    outRgb = (base.rgb * base.a + shadow.rgb * shadow.a * (1.0 - base.a)) / outAlpha;
  }

  gl_FragColor = vec4(outRgb, outAlpha);
`,
);

export default createGpuEffect({
  id: "drop-shadow",
  name: "Drop Shadow",
  icon: "bi-layers-half",
  description: "Adds a configurable shadow behind the current layer.",
  params: [
    { key: "color", label: "Shadow Color", type: "color" },
    {
      key: "matteMode",
      label: "Matte Mode",
      type: "select",
      options: [
        { label: "Alpha", value: "0" },
        { label: "Border Silhouette", value: "1" },
        { label: "Hybrid", value: "2" },
      ],
    },
    { key: "matteThreshold", label: "Matte Threshold", type: "range", min: 0, max: 1.5, step: 0.01 },
    { key: "matteSoftness", label: "Matte Softness", type: "range", min: 0.01, max: 1, step: 0.01 },
    { key: "opacity", label: "Opacity", type: "range", min: 0, max: 100, step: 1, unit: "%" },
    { key: "offsetX", label: "Offset X", type: "range", min: -500, max: 500, step: 1, unit: "px" },
    { key: "offsetY", label: "Offset Y", type: "range", min: -500, max: 500, step: 1, unit: "px" },
    { key: "blur", label: "Blur", type: "range", min: 0, max: 64, step: 0.5, unit: "px" },
    { key: "spread", label: "Spread", type: "range", min: 0, max: 32, step: 0.5, unit: "px" },
    { key: "dither", label: "Dither", type: "range", min: 0, max: 2, step: 0.01 },
  ],
  defaultParams: {
    color: "#000000",
    matteMode: "1",
    matteThreshold: 0.08,
    matteSoftness: 0.12,
    opacity: 55,
    offsetX: 18,
    offsetY: 18,
    blur: 12,
    spread: 2,
    dither: 1,
  },
  render: {
    isNeutral(params) {
      return Number(params.opacity ?? 0) <= 0;
    },
    passes(params) {
      const opacity = Math.min(1, Math.max(0, Number(params.opacity ?? 0) / 100));
      if (opacity <= 0) return [];
      return [
        pass(DROP_SHADOW_FRAGMENT, {
          u_offset: [Number(params.offsetX ?? 0), -Number(params.offsetY ?? 0)],
          u_color: hexToRgb(params.color ?? "#000000"),
          u_matteMode: Number(params.matteMode ?? 2),
          u_matteThreshold: Number(params.matteThreshold ?? 0.22),
          u_matteSoftness: Number(params.matteSoftness ?? 0.16),
          u_opacity: opacity,
          u_blur: Number(params.blur ?? 0),
          u_spread: Number(params.spread ?? 0),
          u_dither: Number(params.dither ?? 1),
        }),
      ];
    },
  },
});
