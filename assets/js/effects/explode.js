import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const EXPLODE_HEADER = `
  uniform int u_type;
  uniform float u_amount;
  uniform float u_size;
  uniform vec2 u_center;
  uniform float u_seed;
  uniform float u_angle;
  uniform float u_rotation;
  uniform float u_shrink;
  uniform float u_shimmer;
  uniform float u_gravity;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p + u_seed) * 43758.5453);
  }

  vec2 rotate(vec2 v, float a) {
    float s = sin(a); float c = cos(a);
    return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
  }

  vec2 safeNormalize(vec2 v, vec2 fallback) {
    float len = length(v);
    return len > 0.0001 ? v / len : fallback;
  }

  float polygonMask(vec2 p, float sides) {
    float radius = length(p);
    float angle = atan(p.y, p.x) + 3.14159265;
    float sector = 6.2831853 / sides;
    float local = mod(angle, sector) - sector * 0.5;
    float boundary = cos(3.14159265 / sides) / max(cos(local), 0.001);
    return radius / max(boundary, 0.001);
  }

  float shardCoverage(float d) {
    return 1.0 - smoothstep(0.72, 1.0, d);
  }
`;

const EXPLODE_BODY = `
  vec2 uv = v_uv;
  vec2 aspect = vec2(u_outputSize.x / u_outputSize.y, 1.0);
  
  // 1. Predictive Back-tracking with Gravity
  // We approximate the origin of a falling shard.
  // Displacement = Velocity * t + 0.5 * Gravity * t^2
  // We use u_amount as a proxy for 'time' (t)
  
  vec2 searchDir;
  vec2 radialFallback = safeNormalize(hash2(floor(uv * aspect * u_size + 0.5)) - 0.5, vec2(1.0, 0.0));
  if (u_type == 0) searchDir = safeNormalize(uv - u_center, radialFallback);
  else if (u_type == 1) searchDir = rotate(safeNormalize(uv - u_center, radialFallback), -1.0);
  else if (u_type == 2) searchDir = vec2(cos(u_angle), sin(u_angle));
  else searchDir = vec2(0.0);
  
  // Back-track the linear velocity AND the parabolic gravity
  float t = u_amount * 0.3;
  vec2 approxOrigin = uv - (searchDir * t) + vec2(0.0, u_gravity * t * t * 0.5);
  
  vec2 gridOrigin = approxOrigin * aspect * u_size;
  vec2 i_st = floor(gridOrigin);
  
  vec4 finalColor = vec4(0.0);
  float maxZ = -1.0;
  
  for (int y = -8; y <= 8; y++) {
    for (int x = -8; x <= 8; x++) {
      vec2 neighbor = i_st + vec2(float(x), float(y));
      vec2 rand = hash2(neighbor);
      vec2 shardOrigCenter = (neighbor + rand) / (u_size * aspect);
      
      vec2 actualDir;
      vec2 shardFallback = safeNormalize(rand - 0.5, vec2(1.0, 0.0));
      if (u_type == 0) actualDir = safeNormalize(shardOrigCenter - u_center, shardFallback);
      else if (u_type == 1) actualDir = rotate(safeNormalize(shardOrigCenter - u_center, shardFallback), 1.5);
      else if (u_type == 2) actualDir = vec2(cos(u_angle), sin(u_angle));
      else actualDir = shardFallback;
      
      float speed = (0.4 + rand.y * 0.6) * u_amount * 0.25;
      float shardRot = (rand.x - 0.5) * u_rotation * u_amount * 0.15;
      float scale = clamp(1.0 - (u_shrink * u_amount * 0.04), 0.05, 2.0);
      
      // Real physics: Linear motion + Gravity pull
      // Note: in WebGL UV space, Y=0 is bottom, so gravity subtracts from Y.
      vec2 displacement = actualDir * speed - vec2(0.0, u_gravity * u_amount * u_amount * 0.02);
      vec2 displacedCenter = shardOrigCenter + displacement;
      
      vec2 localPos = (uv - displacedCenter) * aspect;
      localPos = rotate(localPos, -shardRot);
      localPos /= scale;
      
      vec2 shardPos = localPos * u_size * 1.5;
      float sides = floor(3.0 + rand.y * 4.0);
      float d = polygonMask(shardPos, sides);
      d *= mix(0.9, 1.1, rand.x);
      float coverage = shardCoverage(d);

      float zOrder = rand.x;
      float motionDepth = clamp(length(displacement) * 0.12, 0.0, 1.0);
      float depthScore = motionDepth + zOrder * 0.01;
      if (coverage > 0.001 && depthScore > maxZ) {
        vec2 sampleUv = shardOrigCenter + localPos / aspect;
        vec4 tex = sampleLinear(sampleUv);
        tex.a *= coverage;
        if (u_shimmer > 0.0) {
          float edge = 1.0 - coverage;
          tex.rgb += pow(edge, 4.0) * u_shimmer * 2.0 * vec3(0.9, 0.95, 1.0);
          tex.rgb = mix(tex.rgb, vec3(0.0), smoothstep(0.9, 1.0, d) * 0.3);
        }
        maxZ = depthScore;
        finalColor = tex;
      }
    }
  }
  
  gl_FragColor = finalColor;
`;

const EXPLODE_FRAGMENT = fragmentShaderSource(EXPLODE_HEADER, EXPLODE_BODY);

export default createGpuEffect({
  id: "explode",
  name: "Explode",
  icon: "bi-patch-exclamation",
  description: "Shatters the image into sharp glass fragments with physics-based gravity.",
  params: [
    {
      key: "type",
      label: "Style",
      type: "select",
      options: [
        { label: "Radial Blast", value: "0" },
        { label: "Vortex Spiral", value: "1" },
        { label: "Directional", value: "2" },
        { label: "Chaos", value: "3" },
      ],
    },
    { key: "amount", label: "Intensity", type: "range", min: 0, max: 10, step: 0.1 },
    { key: "gravity", label: "Gravity", type: "range", min: 0, max: 5, step: 0.1 },
    { key: "size", label: "Shard Density", type: "range", min: 5, max: 60, step: 1 },
    { 
      key: "angle", 
      label: "Blast Angle", 
      type: "range", 
      min: 0, max: 360, step: 1, unit: "°",
      show_on: { key: "type", value: "2" }
    },
    { key: "shimmer", label: "Edge Shimmer", type: "range", min: 0, max: 5, step: 0.1 },
    { key: "rotation", label: "Shard Spin", type: "range", min: 0, max: 50, step: 1 },
    { key: "shrink", label: "Shard Shrink", type: "range", min: 0, max: 5, step: 0.1 },
    { key: "centerX", label: "Center X", type: "range", min: 0, max: 1, step: 0.01, interactive: true },
    { key: "centerY", label: "Center Y", type: "range", min: 0, max: 1, step: 0.01, interactive: true },
    { key: "seed", label: "Seed", type: "range", min: 0, max: 100, step: 1 },
  ],
  defaultParams: { 
    type: "0", 
    amount: 3.5, 
    gravity: 1.0,
    size: 30, 
    angle: 0,
    shimmer: 0,
    rotation: 20,
    shrink: 1.0,
    centerX: 0.5, 
    centerY: 0.5, 
    seed: 0 
  },
  render: {
    isNeutral(params) {
      return Number(params.amount ?? 0) <= 0;
    },
    passes(params) {
      const amount = Number(params.amount ?? 0);
      if (amount <= 0) return [];
      
      return [
        pass(EXPLODE_FRAGMENT, {
          u_type: parseInt(params.type ?? "0"),
          u_amount: amount,
          u_gravity: Number(params.gravity ?? 1.0),
          u_size: Number(params.size ?? 30),
          u_angle: (Number(params.angle ?? 0) * Math.PI) / 180,
          u_shimmer: Number(params.shimmer ?? 0),
          u_rotation: Number(params.rotation ?? 20.0),
          u_shrink: Number(params.shrink ?? 1.0),
          u_center: [Number(params.centerX ?? 0.5), Number(params.centerY ?? 0.5)],
          u_seed: Number(params.seed ?? 0),
        }),
      ];
    },
  },
});
