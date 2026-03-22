export function createGpuEffect(config) {
  return {
    ...config,
    engine: "webgl",
  };
}

export function pass(fragmentSource, uniforms = {}, options = {}) {
  return {
    fragmentSource,
    uniforms,
    filter: options.filter ?? "linear",
    luts: options.luts ?? null, // { uniformName: Float32Array(256) }
  };
}

