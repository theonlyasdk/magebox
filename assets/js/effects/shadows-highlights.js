import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const SH_FRAGMENT = fragmentShaderSource(
  `
  uniform float u_shadows;
  uniform float u_highlights;
  uniform float u_radius;
  `,
  `
  vec4 color = sampleLinear(v_uv);
  vec3 rgb = color.rgb;
  float luma = luminance(rgb);
  
  // Use a blurred version of the luma to decide local tonality
  // This prevents the 'flat' HDR look by preserving local contrast
  float localLuma = 0.0;
  vec2 t = u_texelSize * u_radius;
  localLuma += luminance(sampleLinear(v_uv + vec2(t.x, t.y)).rgb);
  localLuma += luminance(sampleLinear(v_uv - vec2(t.x, t.y)).rgb);
  localLuma += luminance(sampleLinear(v_uv + vec2(t.x, -t.y)).rgb);
  localLuma += luminance(sampleLinear(v_uv - vec2(t.x, -t.y)).rgb);
  localLuma *= 0.25;

  // Shadow recovery (targets low luma)
  // We use a power curve that peaks at 0 and falls off at 0.5
  float shadowMask = smoothstep(0.6, 0.0, localLuma);
  vec3 recoveredShadows = rgb + (u_shadows * 0.5 * shadowMask * (1.0 - rgb));
  
  // Highlight reduction (targets high luma)
  float highlightMask = smoothstep(0.4, 1.0, localLuma);
  vec3 recoveredHighlights = rgb * (1.0 - (u_highlights * 0.5 * highlightMask * rgb));

  // Combine adjustments
  vec3 result = mix(rgb, recoveredShadows, u_shadows > 0.0 ? 1.0 : 0.0);
  result = mix(result, recoveredHighlights, u_highlights > 0.0 ? 1.0 : 0.0);
  
  // Final clamp to ensure no blowing out
  gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
`,
);

export default defineGpuEffect({
  id: "shadows-highlights",
  name: "Shadows & Highlights",
  icon: "bi-circle-half",
  description: "Brighten shadows and reduce highlights independently.",
  params: [
    { key: "shadows", label: "Shadows", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "highlights", label: "Highlights", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "radius", label: "Range Radius", type: "range", min: 1, max: 20, step: 0.5, unit: "px" },
  ],
  defaultParams: { shadows: 0.3, highlights: 0.2, radius: 10 },
  gl: {
    isNeutral(params) {
      return Number(params.shadows ?? 0) <= 0 && Number(params.highlights ?? 0) <= 0;
    },
    passes(params) {
      return [
        pass(SH_FRAGMENT, {
          u_shadows: Number(params.shadows ?? 0),
          u_highlights: Number(params.highlights ?? 0),
          u_radius: Number(params.radius ?? 10),
        }),
      ];
    },
  },
});
