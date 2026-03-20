export function defineGpuEffect(config) {
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
  };
}

