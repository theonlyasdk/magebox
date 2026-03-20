import { fragmentShaderSource } from "./shader-chunks.js";

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
uniform vec4 u_uvTransform;
void main() {
  v_uv = (a_position + 1.0) * 0.5 * u_uvTransform.zw + u_uvTransform.xy;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const COPY_FRAGMENT = fragmentShaderSource(
  "",
  `
  gl_FragColor = sampleLinear(v_uv);
`,
);

const RESIZE_BICUBIC_FRAGMENT = fragmentShaderSource(
  `
  vec4 cubic(float v) {
    vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
    vec4 s = n * n * n;
    float x = s.x;
    float y = s.y - 4.0 * s.x;
    float z = s.z - 4.0 * s.y + 6.0 * s.x;
    float w = 6.0 - x - y - z;
    return vec4(x, y, z, w) / 6.0;
  }

  vec4 textureBicubic(vec2 uv) {
    vec2 texSize = u_inputSize;
    vec2 pixel = uv * texSize - 0.5;
    vec2 frac = fract(pixel);
    vec2 base = floor(pixel);
    vec4 xc = cubic(frac.x);
    vec4 yc = cubic(frac.y);
    vec4 c = vec4(base.x - 0.5, base.x + 1.5, base.y - 0.5, base.y + 1.5);
    vec4 s = vec4(xc.x + xc.y, xc.z + xc.w, yc.x + yc.y, yc.z + yc.w);
    vec4 o = c + vec4(xc.y, xc.w, yc.y, yc.w) / s;
    vec2 uv0 = vec2(o.x, o.z) / texSize;
    vec2 uv1 = vec2(o.y, o.z) / texSize;
    vec2 uv2 = vec2(o.x, o.w) / texSize;
    vec2 uv3 = vec2(o.y, o.w) / texSize;
    vec4 sample0 = texture2D(u_texture, uv0);
    vec4 sample1 = texture2D(u_texture, uv1);
    vec4 sample2 = texture2D(u_texture, uv2);
    vec4 sample3 = texture2D(u_texture, uv3);
    float sx = s.x / (s.x + s.y);
    float sy = s.z / (s.z + s.w);
    return mix(mix(sample3, sample2, sx), mix(sample1, sample0, sx), sy);
  }
`,
"gl_FragColor = textureBicubic(v_uv);"
);

const RESIZE_LANCZOS_FRAGMENT = fragmentShaderSource(
  `
  float sinc(float x) {
    if (abs(x) < 0.00001) return 1.0;
    x *= 3.141592653589793;
    return sin(x) / x;
  }

  float lanczos(float x, float a) {
    x = abs(x);
    if (x >= a) return 0.0;
    return sinc(x) * sinc(x / a);
  }

  vec4 resizeLanczos(vec2 uv) {
    vec2 srcCoord = uv * u_inputSize;
    vec2 base = floor(srcCoord);
    vec4 total = vec4(0.0);
    float weightSum = 0.0;
    for (int yy = 0; yy < 6; yy++) {
      for (int xx = 0; xx < 6; xx++) {
        float ox = float(xx) - 2.0;
        float oy = float(yy) - 2.0;
        vec2 coord = base + vec2(ox, oy);
        vec2 sampleUv = (coord + 0.5) / u_inputSize;
        float wx = lanczos(srcCoord.x - coord.x - 0.5, 3.0);
        float wy = lanczos(srcCoord.y - coord.y - 0.5, 3.0);
        float w = wx * wy;
        total += texture2D(u_texture, clamp(sampleUv, vec2(0.0), vec2(1.0))) * w;
        weightSum += w;
      }
    }
    return total / max(weightSum, 0.00001);
  }
`,
"gl_FragColor = resizeLanczos(v_uv);"
);

const SHARPEN_FRAGMENT = fragmentShaderSource(
  "uniform float u_amount;",
  `
  vec4 center = sampleLinear(v_uv);
  vec2 t = u_texelSize;
  vec4 blur =
    sampleLinear(v_uv + vec2(-t.x, 0.0)) +
    sampleLinear(v_uv + vec2(t.x, 0.0)) +
    sampleLinear(v_uv + vec2(0.0, -t.y)) +
    sampleLinear(v_uv + vec2(0.0, t.y));
  blur *= 0.25;
  gl_FragColor = vec4(clamp(center.rgb + (center.rgb - blur.rgb) * u_amount, 0.0, 1.0), center.a);
`,
);

function createGlContext(canvas) {
  return (
    canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    }) || canvas.getContext("experimental-webgl")
  );
}

export class WebGLRenderer {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.gl = createGlContext(this.canvas);
    if (!this.gl) throw new Error("WebGL is not available");

    this.programCache = new Map();
    this.sourceTexture = this.gl.createTexture();
    this.positionBuffer = this.gl.createBuffer();
    this.targetPools = new Map(); // SizeKey -> { textures, framebuffers }

    this.#initGeometry();
  }

  #numberedSource(source) {
    const lines = String(source).split("\n");
    const width = String(lines.length).length;
    return lines.map((line, i) => `${String(i + 1).padStart(width, " ")}: ${line}`).join("\n");
  }

  #initGeometry() {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
  }

  #compile(type, source, label = "") {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      const kind = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
      const prefix = label ? `${label} ` : "";
      throw new Error(
        `${prefix}${kind} shader compile failed.\n${log || "(no shader log)"}\n\n--- Shader source ---\n${this.#numberedSource(
          source,
        )}`,
      );
    }
    return shader;
  }

  #program(fragmentSource) {
    if (this.programCache.has(fragmentSource)) return this.programCache.get(fragmentSource);
    const gl = this.gl;
    const vertex = this.#compile(gl.VERTEX_SHADER, VERTEX_SHADER, "WebGLRenderer");
    const fragment = this.#compile(gl.FRAGMENT_SHADER, fragmentSource, "WebGLRenderer");
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      throw new Error(
        `Program link failed.\n${log || "(no program log)"}\n\n--- Vertex shader source ---\n${this.#numberedSource(
          VERTEX_SHADER,
        )}\n\n--- Fragment shader source ---\n${this.#numberedSource(fragmentSource)}`,
      );
    }
    const record = {
      program,
      locations: {
        position: gl.getAttribLocation(program, "a_position"),
        texture: gl.getUniformLocation(program, "u_texture"),
        inputSize: gl.getUniformLocation(program, "u_inputSize"),
        outputSize: gl.getUniformLocation(program, "u_outputSize"),
        texelSize: gl.getUniformLocation(program, "u_texelSize"),
        uvTransform: gl.getUniformLocation(program, "u_uvTransform"),
      },
      uniformCache: new Map(),
    };
    this.programCache.set(fragmentSource, record);
    return record;
  }

  #getPool(width, height) {
    const key = `${width}x${height}`;
    if (this.targetPools.has(key)) return this.targetPools.get(key);

    const gl = this.gl;
    const textures = [];
    const framebuffers = [];

    for (let i = 0; i < 2; i++) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

      textures.push(texture);
      framebuffers.push(framebuffer);
    }

    const pool = { textures, framebuffers };
    this.targetPools.set(key, pool);
    return pool;
  }

  #bindSourceTexture(image, filter = "linear") {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    // HTML images have a top-left origin; flip on upload so v_uv maps naturally.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const glFilter = filter === "nearest" ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    return this.sourceTexture;
  }

  #uniformLocation(record, name) {
    if (record.uniformCache.has(name)) return record.uniformCache.get(name);
    const loc = this.gl.getUniformLocation(record.program, name);
    record.uniformCache.set(name, loc);
    return loc;
  }

  #setUniform(record, name, value) {
    const gl = this.gl;
    const loc = this.#uniformLocation(record, name);
    if (!loc) return;
    if (typeof value === "number") {
      gl.uniform1f(loc, value);
      return;
    }
    if (value instanceof Float32Array) {
      gl.uniform1fv(loc, value);
      return;
    }
    if (Array.isArray(value)) {
      if (value.length === 2) gl.uniform2f(loc, value[0], value[1]);
      else if (value.length === 3) gl.uniform3f(loc, value[0], value[1], value[2]);
      else if (value.length === 4) gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
      else if (value.length > 4) gl.uniform1fv(loc, new Float32Array(value));
    }
  }

  #drawPass(fragmentSource, inputTexture, inputSize, outputSize, uniforms = {}, target = null, filter = "linear") {
    const gl = this.gl;
    const record = this.#program(fragmentSource);
    gl.useProgram(record.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(record.locations.position);
    gl.vertexAttribPointer(record.locations.position, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    const glFilter = filter === "nearest" ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter);
    if (record.locations.texture) gl.uniform1i(record.locations.texture, 0);
    if (record.locations.inputSize) gl.uniform2f(record.locations.inputSize, inputSize[0], inputSize[1]);
    if (record.locations.outputSize) gl.uniform2f(record.locations.outputSize, outputSize[0], outputSize[1]);
    if (record.locations.texelSize) gl.uniform2f(record.locations.texelSize, 1 / inputSize[0], 1 / inputSize[1]);

    const uvTransform = uniforms.u_uvTransform || [0, 0, 1, 1];
    if (record.locations.uvTransform) {
      gl.uniform4f(record.locations.uvTransform, uvTransform[0], uvTransform[1], uvTransform[2], uvTransform[3]);
    }

    for (const [name, value] of Object.entries(uniforms)) {
      if (name !== "u_uvTransform") this.#setUniform(record, name, value);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, outputSize[0], outputSize[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  #resizePasses(interpolation) {
    if (interpolation === "lanczos3") return [{ fragment: RESIZE_LANCZOS_FRAGMENT, uniforms: {}, filter: "linear" }];
    if (interpolation === "bicubicSharper") {
      return [
        { fragment: RESIZE_BICUBIC_FRAGMENT, uniforms: {}, filter: "linear" },
        { fragment: SHARPEN_FRAGMENT, uniforms: { u_amount: 0.35 }, filter: "linear" },
      ];
    }
    if (interpolation === "bicubic") return [{ fragment: RESIZE_BICUBIC_FRAGMENT, uniforms: {}, filter: "linear" }];
    return [{ fragment: COPY_FRAGMENT, uniforms: {}, filter: interpolation === "nearest" ? "nearest" : "linear" }];
  }

  renderToCanvas({ layers, effects, width, height, previewSampling = "linear", interpolation = "bilinear", targetCanvas, resizeMethod = "fill" }) {
    if (!layers || layers.length === 0 || !targetCanvas) return;

    const gl = this.gl;
    
    // Ensure the internal canvas used for the default framebuffer is the correct size
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    
    // For now, we only support one layer, so we just use the first one.
    const layer = layers[0];
    const image = layer.image;
    
    const sourceTexture = this.#bindSourceTexture(image, previewSampling === "nearest" ? "nearest" : "linear");

    let currentTexture = sourceTexture;
    let currentSize = [image.naturalWidth || image.width, image.naturalHeight || image.height];
    let targetIndex = 0;

    // Split effects into those applied at source resolution and those applied at target resolution
    // Geometry-changing effects like 'repeat' should mark the transition.
    const enabledEffects = effects.filter((entry) => entry.enabled && entry.effect?.gl);
    
    const repeatIdx = enabledEffects.findIndex(e => e.effect.id === 'repeat');
    const sourceEffects = repeatIdx === -1 ? enabledEffects : enabledEffects.slice(0, repeatIdx);
    const targetEffects = repeatIdx === -1 ? [] : enabledEffects.slice(repeatIdx + 1);
    const repeatEffect = repeatIdx === -1 ? null : enabledEffects[repeatIdx];

    // 1. Apply effects at original resolution
    if (sourceEffects.length > 0) {
      const pool = this.#getPool(currentSize[0], currentSize[1]);
      for (const entry of sourceEffects) {
        const context = { inputSize: currentSize, outputSize: currentSize };
        const passes = entry.effect.gl.passes(entry.params, context) ?? [];
        for (const pass of passes) {
          this.#drawPass(
            pass.fragmentSource,
            currentTexture,
            currentSize,
            currentSize,
            pass.uniforms ?? {},
            pool.framebuffers[targetIndex],
            pass.filter ?? "linear",
          );
          currentTexture = pool.textures[targetIndex];
          targetIndex = 1 - targetIndex;
        }
      }
    }

    // 2. Transition pass (Repeat OR Resize/Fill) from Source Size -> Target Size
    const canvasPool = this.#getPool(width, height);
    if (repeatEffect) {
      const context = { inputSize: currentSize, outputSize: [width, height] };
      const passes = repeatEffect.effect.gl.passes(repeatEffect.params, context) ?? [];
      for (const pass of passes) {
        this.#drawPass(
          pass.fragmentSource,
          currentTexture,
          currentSize,
          [width, height],
          pass.uniforms ?? {},
          canvasPool.framebuffers[targetIndex],
          pass.filter ?? "linear",
        );
        currentTexture = canvasPool.textures[targetIndex];
        currentSize = [width, height];
        targetIndex = 1 - targetIndex;
      }
    } else {
      const resizePasses = this.#resizePasses(interpolation);
      let firstPassUvTransform = [0, 0, 1, 1];
      if (resizeMethod === "fill") {
        const imgAspect = currentSize[0] / currentSize[1];
        const targetAspect = width / height;
        if (imgAspect > targetAspect) {
          const scaleX = targetAspect / imgAspect;
          firstPassUvTransform = [(1 - scaleX) / 2, 0, scaleX, 1];
        } else {
          const scaleY = imgAspect / targetAspect;
          firstPassUvTransform = [0, (1 - scaleY) / 2, 1, scaleY];
        }
      } else {
          // 'none' or independent placement - for now just draw at top left/natural size
          const scaleX = width / currentSize[0];
          const scaleY = height / currentSize[1];
          firstPassUvTransform = [0, 0, scaleX, scaleY];
      }

      for (let i = 0; i < resizePasses.length; i++) {
        const pass = resizePasses[i];
        const passUniforms = { ...pass.uniforms };
        if (i === 0) passUniforms.u_uvTransform = firstPassUvTransform;

        this.#drawPass(
          pass.fragment,
          currentTexture,
          currentSize,
          [width, height],
          passUniforms,
          canvasPool.framebuffers[targetIndex],
          pass.filter,
        );
        currentTexture = canvasPool.textures[targetIndex];
        currentSize = [width, height];
        targetIndex = 1 - targetIndex;
      }
    }

    // 3. Apply remaining effects at target resolution
    if (targetEffects.length > 0) {
      for (const entry of targetEffects) {
        const context = { inputSize: currentSize, outputSize: [width, height] };
        const passes = entry.effect.gl.passes(entry.params, context) ?? [];
        for (const pass of passes) {
          this.#drawPass(
            pass.fragmentSource,
            currentTexture,
            currentSize,
            [width, height],
            pass.uniforms ?? {},
            canvasPool.framebuffers[targetIndex],
            pass.filter ?? "linear",
          );
          currentTexture = canvasPool.textures[targetIndex];
          targetIndex = 1 - targetIndex;
        }
      }
    }

    // Final draw to internal canvas (target = null)
    this.#drawPass(COPY_FRAGMENT, currentTexture, currentSize, [width, height], {}, null, "linear");

    // Copy from internal canvas to visible targetCanvas
    targetCanvas.width = width;
    targetCanvas.height = height;
    const ctx = targetCanvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.canvas, 0, 0);
  }
}
