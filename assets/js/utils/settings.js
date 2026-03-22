const KEY = "magebox:settings:v1";

const defaults = {
  theme: "dark",
  showInfoBar: true,
  showUndoPanel: false,
  showCheckerboard: true,
  importAction: "ask", // "ask" | "resize" | "keep"
  zoomFactor: 1,
  panX: 0,
  panY: 0,
  sampling: "linear",
  interpolation: "lanczos3",
  output: {
    width: null,
    height: null,
    lockAspect: true,
    resizeMethod: "fill",
  },
  undoPanelHeight: null,
  skipExperimentalTransformWarning: false,
};

function deepMerge(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v) && base?.[k] && typeof base[k] === "object") {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export class Settings {
  static load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(defaults);
      const parsed = JSON.parse(raw);
      return deepMerge(structuredClone(defaults), parsed);
    } catch {
      return structuredClone(defaults);
    }
  }

  static save(patch) {
    const current = Settings.load();
    const next = deepMerge(current, patch);
    localStorage.setItem(KEY, JSON.stringify(next, null, 2));
    return next;
  }

  static reset() {
    localStorage.removeItem(KEY);
  }
}
