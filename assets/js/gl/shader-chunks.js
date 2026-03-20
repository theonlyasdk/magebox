export const GLSL_COMMON = `
vec4 sampleLinear(vec2 uv) {
  return texture2D(u_texture, clamp(uv, vec2(0.0), vec2(1.0)));
}

vec4 sampleNearest(vec2 uv) {
  vec2 pixel = floor(clamp(uv, vec2(0.0), vec2(1.0)) * u_inputSize);
  vec2 snapped = (pixel + 0.5) / u_inputSize;
  return texture2D(u_texture, snapped);
}

float luminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 rgb2hsl(vec3 color) {
  float maxc = max(max(color.r, color.g), color.b);
  float minc = min(min(color.r, color.g), color.b);
  float l = (maxc + minc) * 0.5;
  float s = 0.0;
  float h = 0.0;
  if (maxc != minc) {
    float d = maxc - minc;
    s = l > 0.5 ? d / (2.0 - maxc - minc) : d / (maxc + minc);
    if (maxc == color.r) {
      h = (color.g - color.b) / d + (color.g < color.b ? 6.0 : 0.0);
    } else if (maxc == color.g) {
      h = (color.b - color.r) / d + 2.0;
    } else {
      h = (color.r - color.g) / d + 4.0;
    }
    h /= 6.0;
  }
  return vec3(h, s, l);
}

float hueDistance01(float a, float b) {
  float d = abs(a - b);
  return d > 0.5 ? 1.0 - d : d;
}
`;

export function fragmentShaderSource(uniforms, body) {
  return [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "varying vec2 v_uv;",
    "uniform sampler2D u_texture;",
    "uniform vec2 u_inputSize;",
    "uniform vec2 u_outputSize;",
    "uniform vec2 u_texelSize;",
    uniforms ? String(uniforms) : "",
    GLSL_COMMON,
    "void main() {",
    body ? String(body) : "",
    "}",
    "",
  ].join("\n");
}
