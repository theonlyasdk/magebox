import { EffectRegistry } from "./effects/registry.js";
import { clampNumber, lerp } from "./utils/math.js";
import { rgbToHex } from "./utils/color.js";
import { Settings } from "./utils/settings.js";

const elements = {
  fileInput: document.getElementById("file-input"),
  downloadBtn: document.getElementById("download-btn"),
  menuUpload: document.getElementById("menu-upload"),
  menuDownload: document.getElementById("menu-download"),
  menuSavePreset: document.getElementById("menu-save-preset"),
  menuLoadPreset: document.getElementById("menu-load-preset"),
  menuResetEffects: document.getElementById("menu-reset-effects"),
  menuImageProperties: document.getElementById("menu-image-properties"),
  menuToggleTheme: document.getElementById("menu-toggle-theme"),
  menuToggleInfoBar: document.getElementById("menu-toggle-infobar"),
  menuToggleUndo: document.getElementById("menu-toggle-undo"),
  previewArea: document.getElementById("preview-area"),
  previewInfoBar: document.getElementById("preview-infobar"),
  zoomOut: document.getElementById("zoom-out"),
  zoomIn: document.getElementById("zoom-in"),
  zoomReset: document.getElementById("zoom-reset"),
  zoomSlider: document.getElementById("zoom-slider"),
  zoomLevel: document.getElementById("zoom-level"),
  pixelInfo: document.getElementById("pixel-info"),
  colorHoverIndicator: document.getElementById("color-hover-indicator"),
  undoPanel: document.getElementById("undo-panel"),
  undoResizer: document.getElementById("undo-resizer"),
  undoList: document.getElementById("undo-list"),
  undoBtn: document.getElementById("undo-btn"),
  redoBtn: document.getElementById("redo-btn"),
  panelLeft: document.getElementById("panel-left"),
  panelMiddle: document.getElementById("panel-middle"),
  panelRight: document.getElementById("panel-right"),
  panelResizers: Array.from(document.querySelectorAll(".panel-resizer")),
  effectsList: document.getElementById("effects-list"),
  effectsCount: document.getElementById("effects-count"),
  emptyState: document.getElementById("empty-state"),
  canvasWrap: document.getElementById("canvas-wrap"),
  canvas: document.getElementById("preview-canvas"),
  imageMeta: document.getElementById("image-meta"),
  panelTitle: document.getElementById("panel-title"),
  effectEnabled: document.getElementById("effect-enabled"),
  effectControls: document.getElementById("effect-controls"),

  imagePropsModalEl: document.getElementById("image-properties-modal"),
  ipName: document.getElementById("ip-name"),
  ipFormat: document.getElementById("ip-format"),
  ipSize: document.getElementById("ip-size"),
  ipDimensions: document.getElementById("ip-dimensions"),
  ipNearest: document.getElementById("ip-nearest"),
  ipInterpolation: document.getElementById("ip-interpolation"),
  ipOutW: document.getElementById("ip-out-w"),
  ipOutH: document.getElementById("ip-out-h"),
  ipLockAspect: document.getElementById("ip-lock-aspect"),

  presetsModalEl: document.getElementById("presets-modal"),
  presetsModalTitle: document.getElementById("presets-modal-title"),
  presetsSaveArea: document.getElementById("presets-save-area"),
  presetsLoadArea: document.getElementById("presets-load-area"),
  presetName: document.getElementById("preset-name"),
  presetSaveBtn: document.getElementById("preset-save-btn"),
  presetsList: document.getElementById("presets-list"),
  presetsEmpty: document.getElementById("presets-empty"),
  presetsJson: document.getElementById("presets-json"),

  colorPopover: document.getElementById("color-popover"),
};

const state = {
  image: null,
  file: null,
  fileName: null,
  selectedEffectId: EffectRegistry[0]?.id ?? null,
  settings: {
    sampling: "linear", // preview smoothing: "linear" | "nearest"
    interpolation: "lanczos3", // download resize: nearest|bilinear|bicubic|bicubicSharper|lanczos3
    output: {
      width: null,
      height: null,
      lockAspect: true,
    },
  },
  view: {
    zoomFactor: 1, // 1.0 == 100% (actual size)
    showInfoBar: true,
    panX: 0,
    panY: 0,
    showUndoPanel: false,
    colorPicker: null, // { effectId, key }
  },
  effects: Object.fromEntries(
    EffectRegistry.map((effect) => [
      effect.id,
      { enabled: false, params: JSON.parse(JSON.stringify(effect.defaultParams ?? {})) },
    ]),
  ),
};

const STORAGE_KEY = "magebox:lastImage:v1";
const PRESETS_KEY = "magebox:presets:v1";
const AUTOSAVE_KEY = "magebox:effectsAutosave:v1";

function persistSettings() {
  Settings.save({
    theme: document.documentElement.dataset.bsTheme ?? "dark",
    showInfoBar: state.view.showInfoBar,
    showUndoPanel: state.view.showUndoPanel,
    zoomFactor: state.view.zoomFactor,
    panX: state.view.panX,
    panY: state.view.panY,
    sampling: state.settings.sampling,
    interpolation: state.settings.interpolation,
    output: state.settings.output,
    undoPanelHeight: elements.undoPanel ? elements.undoPanel.getBoundingClientRect().height : null,
  });
}

function restoreSettings() {
  const s = Settings.load();
  document.documentElement.dataset.bsTheme = s.theme ?? "dark";
  state.view.showInfoBar = Boolean(s.showInfoBar);
  state.view.showUndoPanel = Boolean(s.showUndoPanel);
  state.view.zoomFactor = clampNumber(Number(s.zoomFactor ?? 1), 0.01, 30);
  state.view.panX = clampNumber(Number(s.panX ?? 0), -100000, 100000);
  state.view.panY = clampNumber(Number(s.panY ?? 0), -100000, 100000);
  if (s.sampling) state.settings.sampling = s.sampling;
  if (s.interpolation) state.settings.interpolation = s.interpolation;
  if (s.output) state.settings.output = { ...state.settings.output, ...s.output };
  if (elements.undoPanel && s.undoPanelHeight) {
    elements.undoPanel.style.height = `${Math.max(60, Math.round(s.undoPanelHeight))}px`;
  }
}

const Undo = (() => {
  const entries = [];
  let index = -1;
  let restoring = false;
  const MAX = 200;

  function snapshot() {
    return JSON.parse(
      JSON.stringify({
        effects: state.effects,
        settings: state.settings,
        selectedEffectId: state.selectedEffectId,
      }),
    );
  }

  function applySnapshot(snap) {
    restoring = true;
    state.effects = snap.effects;
    state.settings = snap.settings;
    state.selectedEffectId = snap.selectedEffectId;
    restoring = false;
  }

  function push(label) {
    if (restoring) return;
    const snap = snapshot();
    const last = entries[index]?.snap;
    if (last && JSON.stringify(last) === JSON.stringify(snap)) return;
    entries.splice(index + 1);
    entries.push({
      id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      label: label || "Change",
      at: Date.now(),
      snap,
    });
    if (entries.length > MAX) entries.shift();
    index = entries.length - 1;
    render();
  }

  function reset(label = "Ready") {
    entries.length = 0;
    index = -1;
    push(label);
  }

  function canUndo() {
    return index > 0;
  }
  function canRedo() {
    return index >= 0 && index < entries.length - 1;
  }

  function restoreAt(nextIndex) {
    index = nextIndex;
    applySnapshot(entries[index].snap);
    afterRestore();
    render();
  }

  function undo() {
    if (!canUndo()) return;
    restoreAt(index - 1);
  }
  function redo() {
    if (!canRedo()) return;
    restoreAt(index + 1);
  }

  function afterRestore() {
    renderEffectPanel();
    renderEffectsList();
    syncImagePropsUi();
    requestRender();
    persistSettings();
  }

  function render() {
    if (!elements.undoList || !elements.undoBtn || !elements.redoBtn) return;
    elements.undoBtn.disabled = !canUndo();
    elements.redoBtn.disabled = !canRedo();
    elements.undoList.innerHTML = "";

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const active = i === index;
      const item = document.createElement("button");
      item.type = "button";
      item.className = `list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
        active ? "active" : ""
      }`;
      item.innerHTML = `<span class="text-truncate">${e.label}</span><span class="small">${
        active ? "•" : ""
      }</span>`;
      item.addEventListener("click", () => restoreAt(i));
      elements.undoList.appendChild(item);
    }
  }

  function isRestoring() {
    return restoring;
  }

  return { push, reset, undo, redo, render, isRestoring };
})();

function getEnabledEffects() {
  return EffectRegistry.filter((effect) => state.effects[effect.id]?.enabled);
}

function buildFilterString() {
  const parts = [];
  for (const effect of getEnabledEffects()) {
    const effectState = state.effects[effect.id];
    if (typeof effect.getFilter === "function") {
      const segment = effect.getFilter(effectState.params);
      if (segment) parts.push(segment);
    }
  }
  return parts.length ? parts.join(" ") : "none";
}

function applyPixelEffects(ctx, width, height) {
  const enabled = getEnabledEffects();
  const pixelEffects = enabled.filter((e) => typeof e.applyImageData === "function");
  if (!pixelEffects.length) return;

  let imageData = ctx.getImageData(0, 0, width, height);
  for (const effect of pixelEffects) {
    const effectState = state.effects[effect.id];
    imageData = effect.applyImageData(imageData, width, height, effectState.params) ?? imageData;
  }
  ctx.putImageData(imageData, 0, 0);
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function getImageDataFromImage(img) {
  const canvas = createCanvas(img.naturalWidth, img.naturalHeight);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function sampleNearest(src, sw, sh, x, y) {
  const xi = Math.min(sw - 1, Math.max(0, Math.round(x)));
  const yi = Math.min(sh - 1, Math.max(0, Math.round(y)));
  return (yi * sw + xi) * 4;
}

function clampInt(v, min, max) {
  return Math.min(max, Math.max(min, v | 0));
}

function cubicKernelCatmullRom(t) {
  const a = -0.5;
  const x = Math.abs(t);
  if (x <= 1) return (a + 2) * x * x * x - (a + 3) * x * x + 1;
  if (x < 2) return a * x * x * x - 5 * a * x * x + 8 * a * x - 4 * a;
  return 0;
}

function sinc(x) {
  if (x === 0) return 1;
  const px = Math.PI * x;
  return Math.sin(px) / px;
}

function lanczosKernel(t, a) {
  const x = Math.abs(t);
  if (x >= a) return 0;
  return sinc(x) * sinc(x / a);
}

function resampleImageData(srcImageData, dw, dh, method) {
  const sw = srcImageData.width;
  const sh = srcImageData.height;
  const src = srcImageData.data;
  const dstImageData = new ImageData(dw, dh);
  const dst = dstImageData.data;

  const scaleX = sw / dw;
  const scaleY = sh / dh;

  const radius =
    method === "lanczos3" ? 3 : method === "bicubic" || method === "bicubicSharper" ? 2 : 1;

  for (let y = 0; y < dh; y++) {
    const sy = (y + 0.5) * scaleY - 0.5;
    const y0 = Math.floor(sy);
    for (let x = 0; x < dw; x++) {
      const sx = (x + 0.5) * scaleX - 0.5;
      const x0 = Math.floor(sx);

      if (method === "nearest") {
        const si = sampleNearest(src, sw, sh, sx, sy);
        const di = (y * dw + x) * 4;
        dst[di] = src[si];
        dst[di + 1] = src[si + 1];
        dst[di + 2] = src[si + 2];
        dst[di + 3] = src[si + 3];
        continue;
      }

      if (method === "bilinear") {
        const x1 = Math.floor(sx);
        const y1 = Math.floor(sy);
        const tx = sx - x1;
        const ty = sy - y1;

        const xA = clampInt(x1, 0, sw - 1);
        const xB = clampInt(x1 + 1, 0, sw - 1);
        const yA = clampInt(y1, 0, sh - 1);
        const yB = clampInt(y1 + 1, 0, sh - 1);

        const iAA = (yA * sw + xA) * 4;
        const iBA = (yA * sw + xB) * 4;
        const iAB = (yB * sw + xA) * 4;
        const iBB = (yB * sw + xB) * 4;

        const di = (y * dw + x) * 4;
        for (let c = 0; c < 4; c++) {
          const top = lerp(src[iAA + c], src[iBA + c], tx);
          const bot = lerp(src[iAB + c], src[iBB + c], tx);
          dst[di + c] = lerp(top, bot, ty);
        }
        continue;
      }

      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        weightSum = 0;

      for (let j = y0 - radius + 1; j <= y0 + radius; j++) {
        const yy = clampInt(j, 0, sh - 1);
        const wy =
          method === "lanczos3"
            ? lanczosKernel(sy - j, 3)
            : cubicKernelCatmullRom(sy - j);
        if (wy === 0) continue;

        for (let i = x0 - radius + 1; i <= x0 + radius; i++) {
          const xx = clampInt(i, 0, sw - 1);
          const wx =
            method === "lanczos3"
              ? lanczosKernel(sx - i, 3)
              : cubicKernelCatmullRom(sx - i);
          const w = wx * wy;
          if (w === 0) continue;
          const si = (yy * sw + xx) * 4;
          r += src[si] * w;
          g += src[si + 1] * w;
          b += src[si + 2] * w;
          a += src[si + 3] * w;
          weightSum += w;
        }
      }

      const di = (y * dw + x) * 4;
      if (weightSum === 0) {
        dst[di] = 0;
        dst[di + 1] = 0;
        dst[di + 2] = 0;
        dst[di + 3] = 0;
      } else {
        dst[di] = clampNumber(r / weightSum, 0, 255);
        dst[di + 1] = clampNumber(g / weightSum, 0, 255);
        dst[di + 2] = clampNumber(b / weightSum, 0, 255);
        dst[di + 3] = clampNumber(a / weightSum, 0, 255);
      }
    }
  }
  return dstImageData;
}

function applyUnsharpMask(imageData, amount = 0.3) {
  const { data, width, height } = imageData;
  const src = new Uint8ClampedArray(data);
  const idx = (x, y) => (y * width + x) * 4;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rs = 0,
        gs = 0,
        bs = 0,
        count = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const xx = clamp(x + ox, 0, width - 1);
          const yy = clamp(y + oy, 0, height - 1);
          const i = idx(xx, yy);
          rs += src[i];
          gs += src[i + 1];
          bs += src[i + 2];
          count++;
        }
      }
      const i = idx(x, y);
      const br = rs / count;
      const bg = gs / count;
      const bb = bs / count;
      data[i] = clamp(src[i] + (src[i] - br) * amount, 0, 255);
      data[i + 1] = clamp(src[i + 1] + (src[i + 1] - bg) * amount, 0, 255);
      data[i + 2] = clamp(src[i + 2] + (src[i + 2] - bb) * amount, 0, 255);
    }
  }
  return imageData;
}

function drawToCanvas(
  targetCanvas,
  { maxWidth, maxHeight, overrideWidth = null, overrideHeight = null } = {},
) {
  if (!state.image) return;
  const img = state.image;

  let w;
  let h;
  if (overrideWidth && overrideHeight) {
    w = Math.max(1, Math.round(overrideWidth));
    h = Math.max(1, Math.round(overrideHeight));
  } else {
    const scale =
      maxWidth && maxHeight
        ? Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight)
        : 1;
    w = Math.max(1, Math.round(img.naturalWidth * scale));
    h = Math.max(1, Math.round(img.naturalHeight * scale));
  }
  targetCanvas.width = w;
  targetCanvas.height = h;

  const ctx = targetCanvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.filter = buildFilterString();
  const nearestPreview = state.settings.sampling === "nearest";
  ctx.imageSmoothingEnabled = !nearestPreview;
  if (ctx.imageSmoothingEnabled) ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = "none";
  applyPixelEffects(ctx, w, h);

  if (targetCanvas === elements.canvas) {
    targetCanvas.style.imageRendering = nearestPreview ? "pixelated" : "auto";
    applyZoomStyles();
  }
}

let renderQueued = false;
function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    drawToCanvas(elements.canvas, { maxWidth: 1200, maxHeight: 800 });
    renderEffectsList();
  });
}

function renderEffectsList() {
  elements.effectsList.innerHTML = "";
  elements.effectsCount.textContent = `${EffectRegistry.length}`;

  for (const effect of EffectRegistry) {
    const effectState = state.effects[effect.id];
    const isActive = state.selectedEffectId === effect.id;

    const button = document.createElement("button");
    button.type = "button";
    button.className = `list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
      isActive ? "active" : ""
    }`;

    const left = document.createElement("div");
    left.className = "d-flex align-items-center gap-2";
    left.innerHTML = `<i class="bi ${effect.icon}"></i><span>${effect.name}</span>`;

    const badge = document.createElement("span");
    badge.className = `badge mb-badge-toggle ${effectState.enabled ? "text-bg-primary" : "text-bg-secondary"}`;
    badge.textContent = effectState.enabled ? "On" : "Off";
    badge.role = "button";
    badge.tabIndex = 0;
    badge.title = "Toggle effect";

    const toggle = () => {
      effectState.enabled = !effectState.enabled;
      requestRender();
      renderEffectsList();
      const verb = effectState.enabled ? "Apply" : "Remove";
      Undo.push(`${verb} ${effect.name}`);
    };

    badge.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
    badge.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
    });

    button.appendChild(left);
    button.appendChild(badge);

    button.addEventListener("click", () => {
      state.selectedEffectId = effect.id;
      renderEffectPanel();
      renderEffectsList();
    });

    elements.effectsList.appendChild(button);
  }
}

function renderEffectPanel() {
  const effect = EffectRegistry.find((e) => e.id === state.selectedEffectId);
  if (!effect) {
    elements.panelTitle.textContent = "Properties";
    elements.effectEnabled.checked = false;
    elements.effectControls.innerHTML = `<div class="text-body-secondary">Select an effect on the left.</div>`;
    return;
  }

  const effectState = state.effects[effect.id];
  elements.panelTitle.textContent = effect.name;
  elements.effectEnabled.checked = Boolean(effectState.enabled);

  function ensureEnabled() {
    if (effectState.enabled) return;
    effectState.enabled = true;
    elements.effectEnabled.checked = true;
    renderEffectsList();
    Undo.push(`Apply ${effect.name}`);
  }

  const frag = document.createDocumentFragment();

  if (effect.description) {
    const p = document.createElement("div");
    p.className = "text-body-secondary small mb-3";
    p.textContent = effect.description;
    frag.appendChild(p);
  }

  for (const control of effect.controls ?? []) {
    const key = control.key;
    const value = effectState.params[key];

    const wrapper = document.createElement("div");
    wrapper.className = "mb-3";

    const label = document.createElement("label");
    label.className = "form-label";
    label.htmlFor = `control-${effect.id}-${key}`;
    label.textContent = control.label;

    if (control.type === "select") {
      const select = document.createElement("select");
      select.className = "form-select";
      select.id = `control-${effect.id}-${key}`;
      for (const opt of control.options ?? []) {
        const option = document.createElement("option");
        option.value = String(opt.value);
        option.textContent = opt.label ?? String(opt.value);
        select.appendChild(option);
      }
      select.value = String(value ?? (control.options?.[0]?.value ?? ""));
      select.addEventListener("change", () => {
        effectState.params[key] = select.value;
        ensureEnabled();
        requestRender();
        Undo.push(`Adjust ${effect.name}`);
      });
      wrapper.appendChild(label);
      wrapper.appendChild(select);
    } else if (control.type === "color") {
      const group = document.createElement("div");
      group.className = "btn-group w-100 color-split";

      const chooseBtn = document.createElement("button");
      chooseBtn.type = "button";
      chooseBtn.className =
        "btn btn-outline-secondary d-flex align-items-center justify-content-between";
      chooseBtn.id = `control-${effect.id}-${key}`;

      const swatch = document.createElement("span");
      swatch.className = "d-inline-block rounded-1 border";
      swatch.style.width = "18px";
      swatch.style.height = "18px";
      swatch.style.background = String(value ?? "#ff0000");

      const text = document.createElement("span");
      text.className = "ms-2 flex-grow-1 text-start text-truncate";
      text.textContent = String(value ?? "#ff0000");

      chooseBtn.appendChild(swatch);
      chooseBtn.appendChild(text);

      const pickBtn = document.createElement("button");
      pickBtn.type = "button";
      pickBtn.className = "btn btn-outline-secondary";
      pickBtn.title = "Pick from canvas";
      pickBtn.innerHTML = `<i class="bi bi-eyedropper"></i>`;

      const setColor = (hex) => {
        effectState.params[key] = hex;
        swatch.style.background = hex;
        text.textContent = hex;
        ensureEnabled();
        requestRender();
      };

      chooseBtn.addEventListener("click", () => {
        ColorPopover.open({
          anchorEl: chooseBtn,
          effectId: effect.id,
          key,
          value: String(effectState.params[key] ?? "#ff0000"),
          setColor: (hex) => {
            setColor(hex);
          },
        });
      });

      const isActive =
        state.view.colorPicker?.effectId === effect.id && state.view.colorPicker?.key === key;
      pickBtn.classList.toggle("active", Boolean(isActive));

      pickBtn.addEventListener("click", () => {
        const active =
          state.view.colorPicker?.effectId === effect.id && state.view.colorPicker?.key === key;
        if (active) {
          state.view.colorPicker = null;
          if (elements.colorHoverIndicator) elements.colorHoverIndicator.classList.add("d-none");
          pickBtn.classList.remove("active");
        } else {
          state.view.colorPicker = { effectId: effect.id, key };
          pickBtn.classList.add("active");
        }
      });

      group.appendChild(chooseBtn);
      group.appendChild(pickBtn);

      wrapper.appendChild(label);
      wrapper.appendChild(group);
    } else {
      const input = document.createElement("input");
      input.className = "form-range";
      input.id = `control-${effect.id}-${key}`;
      input.type = control.type ?? "range";
      if (control.min != null) input.min = String(control.min);
      if (control.max != null) input.max = String(control.max);
      if (control.step != null) input.step = String(control.step);
      const transform = control.transform;
      if (transform?.type === "exp") {
        const base = Number(transform.base ?? 10);
        const pv = clampNumber(
          Number(value ?? 1),
          transform.paramMin ?? 0.0001,
          transform.paramMax ?? 1e9,
        );
        input.value = String(Math.log(pv) / Math.log(base));
      } else {
        input.value = String(value ?? control.min ?? 0);
      }

      const help = document.createElement("div");
      help.className = "small text-body-secondary d-flex justify-content-between";
      const current = document.createElement("span");
      const unit = control.unit ? ` ${control.unit}` : "";
      const formatValue = () => {
        if (transform?.type === "exp") {
          const base = Number(transform.base ?? 10);
          const raw = Number(input.value);
          const actual = Math.pow(base, raw);
          const clamped = clampNumber(actual, transform.paramMin ?? 0, transform.paramMax ?? actual);
          return `${clamped.toFixed(2)}${unit}`;
        }
        return `${input.value}${unit}`;
      };
      current.textContent = formatValue();
      const range = document.createElement("span");
      const minText = control.min != null ? control.min : "";
      const maxText = control.max != null ? control.max : "";
      range.textContent = minText !== "" && maxText !== "" ? `${minText}–${maxText}${unit}` : "";
      help.appendChild(current);
      help.appendChild(range);

      input.addEventListener("input", () => {
        current.textContent = formatValue();
        const numericValue = Number(input.value);
        if (transform?.type === "exp") {
          const base = Number(transform.base ?? 10);
          const actual = Math.pow(base, numericValue);
          effectState.params[key] = clampNumber(
            actual,
            transform.paramMin ?? 0,
            transform.paramMax ?? actual,
          );
        } else {
          const min = control.min != null ? Number(control.min) : -Infinity;
          const max = control.max != null ? Number(control.max) : Infinity;
          effectState.params[key] = clampNumber(numericValue, min, max);
        }
        ensureEnabled();
        requestRender();
      });
      input.addEventListener("change", () => {
        ensureEnabled();
        Undo.push(`Adjust ${effect.name}`);
      });

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      wrapper.appendChild(help);
    }
    frag.appendChild(wrapper);
  }

  if (!effect.controls?.length) {
    const p = document.createElement("div");
    p.className = "text-body-secondary";
    p.textContent = "No controls for this effect.";
    frag.appendChild(p);
  }

  elements.effectControls.innerHTML = "";
  elements.effectControls.appendChild(frag);
}

function setImageFromFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  state.file = file;
  state.fileName = file.name;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || "");
    if (!dataUrl.startsWith("data:image/")) return;
    setImageFromDataUrl(dataUrl, { name: file.name, type: file.type, size: file.size });
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ dataUrl, name: file.name, type: file.type, size: file.size }),
      );
    } catch {
      // ignore storage quota errors
    }
  };
  reader.readAsDataURL(file);
}

function setImageFromDataUrl(dataUrl, meta = {}) {
  const img = new Image();
  img.onload = () => {
    state.image = img;
    state.fileName = meta.name ?? state.fileName ?? "image";
    state.file = meta
      ? { name: meta.name, type: meta.type, size: meta.size }
      : state.file;

    elements.emptyState.classList.add("d-none");
    elements.canvasWrap.classList.remove("d-none");
    elements.downloadBtn.classList.remove("d-none");
    elements.menuDownload?.classList.remove("d-none");
    elements.imageMeta.textContent = `${img.naturalWidth}×${img.naturalHeight} • ${state.fileName}`;
    if (state.settings.output.width == null) state.settings.output.width = img.naturalWidth;
    if (state.settings.output.height == null) state.settings.output.height = img.naturalHeight;
    // Default zoom: fit large images, don't upscale tiny images
    const fit = computeFitZoom();
    state.view.zoomFactor = Math.min(1, fit);
    state.view.panX = 0;
    state.view.panY = 0;
    requestRender();
    Undo.reset("Original image");
  };
  img.src = dataUrl;
}

async function downloadImage() {
  if (!state.image) return;
  const outW = Number(state.settings.output.width ?? state.image.naturalWidth);
  const outH = Number(state.settings.output.height ?? state.image.naturalHeight);
  const canvas = createCanvas(outW, outH);

  const needResize = outW !== state.image.naturalWidth || outH !== state.image.naturalHeight;
  if (needResize) {
    const srcData = getImageDataFromImage(state.image);
    const method = state.settings.interpolation || "lanczos3";
    let resized = resampleImageData(srcData, canvas.width, canvas.height, method);
    if (method === "bicubicSharper") resized = applyUnsharpMask(resized, 0.35);

    const base = createCanvas(canvas.width, canvas.height);
    base.getContext("2d").putImageData(resized, 0, 0);

    const ctx = canvas.getContext("2d");
    ctx.filter = buildFilterString();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(base, 0, 0);
    ctx.filter = "none";
    applyPixelEffects(ctx, canvas.width, canvas.height);
  } else {
    // No resize; use native draw + filters.
    const ctx = canvas.getContext("2d");
    ctx.filter = buildFilterString();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    applyPixelEffects(ctx, canvas.width, canvas.height);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const base = (state.fileName ?? "magebox").replace(/\.[^/.]+$/, "");
  a.download = `${base}-edited.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

elements.fileInput.addEventListener("change", (e) => setImageFromFile(e.target.files?.[0]));

elements.effectEnabled.addEventListener("change", () => {
  const effectId = state.selectedEffectId;
  if (!effectId) return;
  state.effects[effectId].enabled = elements.effectEnabled.checked;
  requestRender();
  renderEffectsList();
  const effect = EffectRegistry.find((e) => e.id === effectId);
  Undo.push(`${elements.effectEnabled.checked ? "Apply" : "Remove"} ${effect?.name ?? effectId}`);
});

elements.downloadBtn.addEventListener("click", downloadImage);

function humanBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = n;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const decimals = unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

const imagePropsModal =
  elements.imagePropsModalEl ? new bootstrap.Modal(elements.imagePropsModalEl) : null;
const presetsModal = elements.presetsModalEl ? new bootstrap.Modal(elements.presetsModalEl) : null;

function syncImagePropsUi() {
  if (!elements.imagePropsModalEl) return;

  const file = state.file;
  const img = state.image;

  elements.ipName.textContent = file?.name ?? "—";
  elements.ipFormat.textContent = file?.type ?? "—";
  elements.ipSize.textContent = file ? humanBytes(file.size) : "—";
  elements.ipDimensions.textContent = img ? `${img.naturalWidth}×${img.naturalHeight}` : "—";

  elements.ipNearest.checked = state.settings.sampling === "nearest";
  if (elements.ipInterpolation) elements.ipInterpolation.value = state.settings.interpolation;

  elements.ipOutW.value = String(state.settings.output.width ?? "");
  elements.ipOutH.value = String(state.settings.output.height ?? "");
  elements.ipLockAspect.checked = Boolean(state.settings.output.lockAspect);

}

function openImageProperties() {
  if (!imagePropsModal) return;
  syncImagePropsUi();
  imagePropsModal.show();
}

function getEffectsConfig() {
  return {
    version: 1,
    at: new Date().toISOString(),
    effects: state.effects,
    settings: {
      sampling: state.settings.sampling,
      interpolation: state.settings.interpolation,
      output: state.settings.output,
    },
  };
}

function setEffectsConfig(config) {
  if (!config || typeof config !== "object") return;
  if (config.effects && typeof config.effects === "object") {
    // Keep only effects we know about, merge defaults for missing params.
    for (const effect of EffectRegistry) {
      const incoming = config.effects[effect.id];
      if (!incoming) continue;
      state.effects[effect.id].enabled = Boolean(incoming.enabled);
      state.effects[effect.id].params = {
        ...JSON.parse(JSON.stringify(effect.defaultParams ?? {})),
        ...(incoming.params ?? {}),
      };
    }
  }
  if (config.settings) {
    if (config.settings.sampling) state.settings.sampling = config.settings.sampling;
    if (config.settings.interpolation) state.settings.interpolation = config.settings.interpolation;
    if (config.settings.output)
      state.settings.output = { ...state.settings.output, ...config.settings.output };
  }
  renderEffectsList();
  renderEffectPanel();
  syncImagePropsUi();
  requestRender();
  persistSettings();
}

function loadPresetsStore() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return { version: 1, presets: {} };
    const parsed = JSON.parse(raw);
    return { version: 1, presets: parsed.presets ?? parsed ?? {} };
  } catch {
    return { version: 1, presets: {} };
  }
}

function savePresetsStore(store) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(store, null, 2));
}

function renderPresetsList() {
  if (!elements.presetsList || !elements.presetsEmpty) return;
  const store = loadPresetsStore();
  const names = Object.keys(store.presets ?? {}).sort((a, b) => a.localeCompare(b));

  elements.presetsList.innerHTML = "";
  elements.presetsEmpty.style.display = names.length ? "none" : "block";

  for (const name of names) {
    const row = document.createElement("div");
    row.className = "list-group-item d-flex align-items-center justify-content-between";
    row.innerHTML = `<span class="text-truncate">${name}</span>`;

    const actions = document.createElement("div");
    actions.className = "btn-group btn-group-sm";
    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "btn btn-outline-primary";
    loadBtn.textContent = "Load";
    loadBtn.addEventListener("click", () => {
      setEffectsConfig(store.presets[name]);
      Undo.push(`Load preset: ${name}`);
      presetsModal?.hide();
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-outline-danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      delete store.presets[name];
      savePresetsStore(store);
      renderPresetsList();
    });

    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);
    row.appendChild(actions);
    elements.presetsList.appendChild(row);
  }
}

function openPresets(mode) {
  if (!presetsModal) return;
  if (elements.presetsModalTitle) {
    elements.presetsModalTitle.textContent = mode === "save" ? "Save Effects" : "Load Effects";
  }
  if (elements.presetsSaveArea) elements.presetsSaveArea.style.display = mode === "save" ? "" : "none";
  if (elements.presetsLoadArea) elements.presetsLoadArea.style.display = "";
  if (elements.presetName) elements.presetName.value = "";
  if (elements.presetsJson) elements.presetsJson.textContent = JSON.stringify(getEffectsConfig(), null, 2);
  renderPresetsList();
  presetsModal.show();
}

function autosaveEffectsConfig() {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(getEffectsConfig(), null, 2));
  } catch {
    // ignore quota
  }
}

function restoreAutosaveEffectsConfig() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    setEffectsConfig(parsed);
  } catch {
    // ignore
  }
}

function resetEffects() {
  for (const effect of EffectRegistry) {
    state.effects[effect.id].enabled = false;
    state.effects[effect.id].params = JSON.parse(JSON.stringify(effect.defaultParams ?? {}));
  }
  renderEffectPanel();
  requestRender();
  Undo.push("Reset effects");
}

elements.menuUpload?.addEventListener("click", () => elements.fileInput.click());
elements.menuDownload?.addEventListener("click", downloadImage);
elements.menuSavePreset?.addEventListener("click", () => openPresets("save"));
elements.menuLoadPreset?.addEventListener("click", () => openPresets("load"));
elements.menuImageProperties?.addEventListener("click", openImageProperties);
elements.menuResetEffects?.addEventListener("click", resetEffects);
elements.menuToggleTheme?.addEventListener("click", () => {
  const root = document.documentElement;
  root.dataset.bsTheme = root.dataset.bsTheme === "light" ? "dark" : "light";
  persistSettings();
});

elements.previewArea?.addEventListener("click", () => {
  if (!state.image) elements.fileInput.click();
});

function applyZoomStyles() {
  if (!elements.canvas) return;
  const zoom = state.view.zoomFactor;
  if (!state.image || elements.canvas.width === 0 || elements.canvas.height === 0) {
    elements.zoomLevel &&
      (elements.zoomLevel.textContent = `${Math.round(state.view.zoomFactor * 100)}%`);
    if (elements.zoomSlider) elements.zoomSlider.value = String(state.view.zoomFactor);
    return;
  }

  elements.canvas.style.transformOrigin = "center center";
  elements.canvas.style.transform = `translate(${Math.round(state.view.panX)}px, ${Math.round(
    state.view.panY,
  )}px) scale(${zoom})`;
  if (elements.zoomLevel) elements.zoomLevel.textContent = `${Math.round(state.view.zoomFactor * 100)}%`;
  if (elements.zoomSlider) elements.zoomSlider.value = String(state.view.zoomFactor);
  persistSettings();
}

function setZoom(next) {
  state.view.zoomFactor = clampNumber(Number(next), 0.01, 30);
  applyZoomStyles();
}

function computeFitZoom() {
  if (!state.image || !elements.previewArea || !elements.canvas) return 1;
  const bodyRect = elements.previewArea.getBoundingClientRect();
  const padding = 24; // rough card-body padding allowance
  const maxW = Math.max(1, bodyRect.width - padding);
  const maxH = Math.max(1, bodyRect.height - padding);
  const cw = Math.max(1, elements.canvas.width);
  const ch = Math.max(1, elements.canvas.height);
  return Math.max(0.01, Math.min(maxW / cw, maxH / ch));
}

function initZoomBar() {
  if (elements.zoomSlider) {
    elements.zoomSlider.addEventListener("input", () => setZoom(elements.zoomSlider.value));
  }
  elements.zoomOut?.addEventListener("click", () => setZoom(state.view.zoomFactor - 0.1));
  elements.zoomIn?.addEventListener("click", () => setZoom(state.view.zoomFactor + 0.1));
  elements.zoomReset?.addEventListener("click", () => {
    state.view.panX = 0;
    state.view.panY = 0;
    setZoom(1);
  });
  applyZoomStyles();
}

function initPixelHover() {
  if (!elements.canvas || !elements.pixelInfo) return;
  const update = (clientX, clientY) => {
    if (!state.image) {
      elements.pixelInfo.textContent = "—";
      return;
    }
    const rect = elements.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      elements.pixelInfo.textContent = "—";
      return;
    }
    const px = Math.floor((x / rect.width) * elements.canvas.width);
    const py = Math.floor((y / rect.height) * elements.canvas.height);
    elements.pixelInfo.textContent = `(${px}, ${py})`;
  };

  elements.canvas.addEventListener("mousemove", (e) => update(e.clientX, e.clientY));
  elements.canvas.addEventListener("mouseleave", () => {
    elements.pixelInfo.textContent = "—";
  });
}

function initColorPicker() {
  const canvas = elements.canvas;
  const area = elements.previewArea;
  const indicator = elements.colorHoverIndicator;
  if (!canvas || !area || !indicator) return;

  function setIndicator(x, y, color) {
    indicator.style.left = `${x}px`;
    indicator.style.top = `${y - 12}px`;
    indicator.style.background = color;
    indicator.classList.remove("d-none");
  }

  function hideIndicator() {
    indicator.classList.add("d-none");
  }

  function sampleAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    const px = Math.floor((x / rect.width) * canvas.width);
    const py = Math.floor((y / rect.height) * canvas.height);
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(px, py, 1, 1).data;
    return { px, py, color: rgbToHex(data[0], data[1], data[2]) };
  }

  area.addEventListener("mousemove", (e) => {
    if (!state.view.colorPicker) return;
    const sampled = sampleAt(e.clientX, e.clientY);
    if (!sampled) {
      hideIndicator();
      return;
    }
    const areaRect = area.getBoundingClientRect();
    setIndicator(e.clientX - areaRect.left, e.clientY - areaRect.top, sampled.color);
  });

  area.addEventListener("mouseleave", () => {
    hideIndicator();
  });

  area.addEventListener("click", (e) => {
    if (!state.view.colorPicker) return;
    const sampled = sampleAt(e.clientX, e.clientY);
    if (!sampled) return;
    const { effectId, key } = state.view.colorPicker;
    const effect = EffectRegistry.find((ef) => ef.id === effectId);
    if (!effect) return;
    const effectState = state.effects[effectId];
    effectState.params[key] = sampled.color;
    effectState.enabled = true;
    if (state.selectedEffectId === effectId) elements.effectEnabled.checked = true;
    renderEffectsList();
    renderEffectPanel();
    requestRender();
    Undo.push(`Adjust ${effect.name}`);
    // auto-exit picker mode after selection
    state.view.colorPicker = null;
    hideIndicator();
    renderEffectPanel();
  });
}

const ColorPopover = (() => {
  let openState = null; // { effectId, key, setColor, anchorEl }
  let hue = 120; // 0..360
  let sv = { s: 1, v: 1 };

  const el = elements.colorPopover;
  if (!el) return { open() {}, close() {}, isOpen() { return false; } };

  el.innerHTML = `
    <div class="card shadow">
      <div class="card-body p-2">
        <canvas class="color-sv mb-2" width="260" height="160"></canvas>
        <canvas class="color-hue mb-2" width="260" height="14"></canvas>
        <div class="input-group input-group-sm">
          <span class="input-group-text">#</span>
          <input class="form-control font-monospace" id="cp-hex" maxlength="6" placeholder="RRGGBB" />
        </div>
      </div>
    </div>
  `;

  const svCanvas = el.querySelector(".color-sv");
  const hueCanvas = el.querySelector(".color-hue");
  const hexInput = el.querySelector("#cp-hex");

  function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0,
      g = 0,
      b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  function setFromHex(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    // cheap RGB->HSV
    const rf = r / 255;
    const gf = g / 255;
    const bf = b / 255;
    const max = Math.max(rf, gf, bf);
    const min = Math.min(rf, gf, bf);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === rf) h = ((gf - bf) / d + (gf < bf ? 6 : 0)) * 60;
      else if (max === gf) h = ((bf - rf) / d + 2) * 60;
      else h = ((rf - gf) / d + 4) * 60;
    }
    const s = max === 0 ? 0 : d / max;
    const v = max;
    hue = h;
    sv = { s, v };
    draw();
  }

  function currentHex() {
    const { r, g, b } = hsvToRgb(hue, sv.s, sv.v);
    return rgbToHex(r, g, b);
  }

  function commit() {
    if (!openState) return;
    openState.setColor(currentHex());
  }

  function drawHue() {
    const ctx = hueCanvas.getContext("2d");
    const w = hueCanvas.width;
    const h = hueCanvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 360; i += 60) grad.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    const x = (hue / 360) * w;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  function drawSV() {
    const ctx = svCanvas.getContext("2d");
    const w = svCanvas.width;
    const h = svCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(0, 0, w, h);
    const white = ctx.createLinearGradient(0, 0, w, 0);
    white.addColorStop(0, "rgba(255,255,255,1)");
    white.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = white;
    ctx.fillRect(0, 0, w, h);
    const black = ctx.createLinearGradient(0, 0, 0, h);
    black.addColorStop(0, "rgba(0,0,0,0)");
    black.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = black;
    ctx.fillRect(0, 0, w, h);

    const x = sv.s * w;
    const y = (1 - sv.v) * h;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 7.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  function draw() {
    drawHue();
    drawSV();
    if (hexInput) hexInput.value = currentHex().replace("#", "").toUpperCase();
  }

  function positionUnder(anchorEl) {
    const r = anchorEl.getBoundingClientRect();
    const top = r.bottom + 6 + window.scrollY;
    const left = r.left + window.scrollX;
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    // clamp to viewport
    const rect = el.getBoundingClientRect();
    const overflowX = rect.right - window.innerWidth;
    if (overflowX > 0) el.style.left = `${left - overflowX - 8}px`;
  }

  function open({ anchorEl, effectId, key, value, setColor }) {
    openState = { anchorEl, effectId, key, setColor };
    el.classList.remove("d-none");
    el.setAttribute("aria-hidden", "false");
    positionUnder(anchorEl);
    setFromHex(value ?? "#ff0000");
    draw();
  }

  function close() {
    openState = null;
    el.classList.add("d-none");
    el.setAttribute("aria-hidden", "true");
  }

  function isOpen() {
    return !el.classList.contains("d-none");
  }

  function pointerPos(canvas, e) {
    const r = canvas.getBoundingClientRect();
    const x = clampNumber((e.clientX - r.left) / r.width, 0, 1);
    const y = clampNumber((e.clientY - r.top) / r.height, 0, 1);
    return { x, y };
  }

  let dragging = null; // "sv" | "hue"
  function onMove(e) {
    if (!dragging) return;
    if (dragging === "hue") {
      const { x } = pointerPos(hueCanvas, e);
      hue = x * 360;
      draw();
      commit();
    } else if (dragging === "sv") {
      const { x, y } = pointerPos(svCanvas, e);
      sv = { s: x, v: 1 - y };
      draw();
      commit();
    }
  }
  function onUp() {
    dragging = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }

  hueCanvas.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = "hue";
    onMove(e);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
  svCanvas.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = "sv";
    onMove(e);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  hexInput.addEventListener("input", () => {
    const v = hexInput.value.trim();
    if (/^[0-9a-f]{6}$/i.test(v)) {
      setFromHex(v);
      commit();
    }
  });

  window.addEventListener("mousedown", (e) => {
    if (!isOpen()) return;
    if (openState?.anchorEl?.contains(e.target)) return;
    if (el.contains(e.target)) return;
    close();
  });

  window.addEventListener("resize", () => {
    if (!isOpen() || !openState?.anchorEl) return;
    positionUnder(openState.anchorEl);
  });
  window.addEventListener("scroll", () => {
    if (!isOpen() || !openState?.anchorEl) return;
    positionUnder(openState.anchorEl);
  });

  return { open, close, isOpen };
})();

function applyInfoBarVisibility() {
  if (!elements.previewInfoBar) return;
  elements.previewInfoBar.classList.toggle("d-none", !state.view.showInfoBar);
}

function applyUndoPanelVisibility() {
  if (!elements.undoPanel || !elements.undoResizer) return;
  const show = state.view.showUndoPanel;
  elements.undoPanel.classList.toggle("d-none", !show);
  elements.undoResizer.classList.toggle("d-none", !show);
}

function persistUndoUi() {
  persistSettings();
}

function restoreUndoUi() {
  // handled by restoreSettings()
}

function initUndoPanelResize() {
  const resizer = elements.undoResizer;
  const panel = elements.undoPanel;
  const right = elements.panelRight;
  if (!resizer || !panel || !right) return;

  resizer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    resizer.classList.add("is-dragging");
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    const startY = e.clientY;
    const startH = panel.getBoundingClientRect().height;
    const rightRect = right.getBoundingClientRect();

    const minH = 80;
    const maxH = Math.max(minH, rightRect.height - 120);

    function onMove(ev) {
      const dy = ev.clientY - startY;
      const next = clampNumber(startH - dy, minH, maxH);
      panel.style.height = `${Math.round(next)}px`;
    }

    function onUp() {
      resizer.classList.remove("is-dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      persistUndoUi();
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
}

function initPanning() {
  const canvas = elements.canvas;
  const area = elements.previewArea;
  if (!canvas || !area) return;
  let active = false;
  let startX = 0;
  let startY = 0;
  let startPanX = 0;
  let startPanY = 0;
  let spaceDown = false;
  let mode = null; // "middle" | "space"
  let lastMoveX = 0;
  let lastMoveY = 0;

  function begin(e, nextMode) {
    if (!state.image) return;
    active = true;
    mode = nextMode;
    startX = e.clientX;
    startY = e.clientY;
    startPanX = state.view.panX;
    startPanY = state.view.panY;
    canvas.classList.add("is-panning");
  }

  function maybeBegin(e) {
    if (e.button === 1) {
      e.preventDefault();
      begin(e, "middle");
      return;
    }
    if (e.button === 0 && spaceDown) {
      e.preventDefault();
      begin(e, "space");
    }
  }

  area.addEventListener("mousedown", maybeBegin);

  window.addEventListener("mousemove", (e) => {
    if (active) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      state.view.panX = startPanX + dx;
      state.view.panY = startPanY + dy;
      applyZoomStyles();
      return;
    }
    if (spaceDown && state.image) {
      // "Instant" pan while holding Space (no click required)
      if (lastMoveX !== 0 || lastMoveY !== 0) {
        const dx = e.clientX - lastMoveX;
        const dy = e.clientY - lastMoveY;
        state.view.panX += dx;
        state.view.panY += dy;
        applyZoomStyles();
      }
      lastMoveX = e.clientX;
      lastMoveY = e.clientY;
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (!active) return;
    if (mode === "middle" && e.button !== 1) return;
    if (mode === "space" && e.button !== 0) return;
    active = false;
    mode = null;
    canvas.classList.remove("is-panning");
    persistSettings();
  });

  // Prevent autoscroll on middle click
  area.addEventListener("auxclick", (e) => {
    if (e.button === 1) e.preventDefault();
  });

  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    if (spaceDown) return;
    spaceDown = true;
    area.classList.add("is-spacepan");
    lastMoveX = 0;
    lastMoveY = 0;
  });
  window.addEventListener("keyup", (e) => {
    if (e.code !== "Space") return;
    spaceDown = false;
    area.classList.remove("is-spacepan");
    lastMoveX = 0;
    lastMoveY = 0;
  });
}

function initDragDropPreview() {
  const el = elements.previewArea;
  if (!el) return;

  const add = () => el.classList.add("is-dragover");
  const remove = () => el.classList.remove("is-dragover");

  el.addEventListener("dragenter", (e) => {
    e.preventDefault();
    add();
  });
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    add();
  });
  el.addEventListener("dragleave", () => remove());
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    remove();
    const file = e.dataTransfer?.files?.[0];
    if (file) setImageFromFile(file);
  });
}

function initResizablePanels() {
  const left = elements.panelLeft;
  const middle = elements.panelMiddle;
  const right = elements.panelRight;
  if (!left || !middle || !right) return;

  const minLeft = 220;
  const minMiddle = 320;
  const minRight = 260;

  function setBases({ leftPx, rightPx }) {
    if (leftPx != null) left.style.flexBasis = `${Math.max(minLeft, Math.round(leftPx))}px`;
    if (rightPx != null) right.style.flexBasis = `${Math.max(minRight, Math.round(rightPx))}px`;
  }

  function getBases() {
    return {
      left: left.getBoundingClientRect().width,
      right: right.getBoundingClientRect().width,
      total: left.parentElement.getBoundingClientRect().width,
    };
  }

  for (const resizer of elements.panelResizers) {
    resizer.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const kind = resizer.dataset.resize; // left or middle
      resizer.classList.add("is-dragging");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const startX = e.clientX;
      const bases = getBases();

      function onMove(ev) {
        const dx = ev.clientX - startX;
        if (kind === "left") {
          const nextLeft = bases.left + dx;
          const maxLeft = bases.total - minMiddle - bases.right - 16;
          setBases({ leftPx: Math.min(maxLeft, nextLeft) });
        } else if (kind === "middle") {
          // Dragging between middle and right adjusts right basis inversely.
          const nextRight = bases.right - dx;
          const maxRight = bases.total - minMiddle - bases.left - 16;
          setBases({ rightPx: Math.min(maxRight, nextRight) });
        }
      }

      function onUp() {
        resizer.classList.remove("is-dragging");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }
}

function initWheelZoom() {
  const area = elements.previewArea;
  const canvas = elements.canvas;
  if (!area || !canvas) return;

  area.addEventListener(
    "wheel",
    (e) => {
      if (!state.image) return;
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const mx = e.clientX;
      const my = e.clientY;
      const dx = mx - cx;
      const dy = my - cy;

      const current = state.view.zoomFactor;
      const direction = e.deltaY > 0 ? -1 : 1;
      const factor = Math.pow(1.12, direction);
      const next = clampNumber(current * factor, 0.01, 30);

      // Keep the point under the cursor stable by adjusting pan.
      const scale = next / current;
      state.view.panX = state.view.panX + dx * (1 - scale);
      state.view.panY = state.view.panY + dy * (1 - scale);
      state.view.zoomFactor = next;
      applyZoomStyles();
    },
    { passive: false },
  );
}

function initMenubarHover() {
  const dropdownEls = Array.from(document.querySelectorAll(".menubar .dropdown"));
  if (!dropdownEls.length) return;

  const dropdowns = dropdownEls
    .map((el) => {
      const toggle = el.querySelector("[data-bs-toggle='dropdown']");
      if (!toggle) return null;
      return { el, toggle, api: bootstrap.Dropdown.getOrCreateInstance(toggle) };
    })
    .filter(Boolean);

  let openDropdown = null;
  let pending = null;

  for (const d of dropdowns) {
    d.el.addEventListener("shown.bs.dropdown", () => {
      openDropdown = d;
      d.toggle.classList.add("active");
    });
    d.el.addEventListener("hidden.bs.dropdown", () => {
      d.toggle.classList.remove("active");
      if (openDropdown === d) openDropdown = null;
      if (pending?.toggle === d.toggle) pending = null;
    });

    d.toggle.addEventListener("mouseenter", () => {
      if (d.el.classList.contains("show")) return;
      if (!openDropdown) return;

      pending = d;
      if (openDropdown && openDropdown !== d) {
        const current = openDropdown;
        const onHidden = () => {
          current.el.removeEventListener("hidden.bs.dropdown", onHidden);
          if (pending === d) d.api.show();
        };
        current.el.addEventListener("hidden.bs.dropdown", onHidden);
        current.api.hide();
      } else {
        d.api.show();
      }
    });
  }
}

elements.ipNearest?.addEventListener("change", () => {
  state.settings.sampling = elements.ipNearest.checked ? "nearest" : "linear";
  requestRender();
  persistSettings();
  Undo.push("Pixel-art mode");
});

elements.ipInterpolation?.addEventListener("change", () => {
  state.settings.interpolation = elements.ipInterpolation.value;
  persistSettings();
  Undo.push("Interpolation");
});

// Output is always PNG.

function applyResizeFromUi({ changed } = {}) {
  if (!state.image) return;
  const lockAspect = Boolean(elements.ipLockAspect?.checked);
  state.settings.output.lockAspect = lockAspect;

  const naturalW = state.image.naturalWidth;
  const naturalH = state.image.naturalHeight;
  const aspect = naturalW / naturalH;

  let w = Number(elements.ipOutW.value);
  let h = Number(elements.ipOutH.value);
  if (!Number.isFinite(w) || w <= 0) w = naturalW;
  if (!Number.isFinite(h) || h <= 0) h = naturalH;

  if (lockAspect) {
    if (changed === "w") h = Math.max(1, Math.round(w / aspect));
    if (changed === "h") w = Math.max(1, Math.round(h * aspect));
  }

  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));

  state.settings.output.width = w;
  state.settings.output.height = h;
  elements.ipOutW.value = String(w);
  elements.ipOutH.value = String(h);
  persistSettings();
}

elements.ipOutW?.addEventListener("input", () => applyResizeFromUi({ changed: "w" }));
elements.ipOutH?.addEventListener("input", () => applyResizeFromUi({ changed: "h" }));
elements.ipLockAspect?.addEventListener("change", () => applyResizeFromUi());
elements.ipOutW?.addEventListener("change", () => Undo.push("Resize"));
elements.ipOutH?.addEventListener("change", () => Undo.push("Resize"));
elements.ipLockAspect?.addEventListener("change", () => Undo.push("Resize"));

// Image size presets
document.querySelectorAll("[data-size-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!state.image) return;
    const v = btn.getAttribute("data-size-preset");
    const naturalW = state.image.naturalWidth;
    const naturalH = state.image.naturalHeight;
    if (v === "orig") {
      state.settings.output.width = naturalW;
      state.settings.output.height = naturalH;
    } else {
      const factor = clampNumber(Number(v), 0.01, 100);
      state.settings.output.width = Math.max(1, Math.round(naturalW * factor));
      state.settings.output.height = Math.max(1, Math.round(naturalH * factor));
    }
    if (elements.ipOutW) elements.ipOutW.value = String(state.settings.output.width);
    if (elements.ipOutH) elements.ipOutH.value = String(state.settings.output.height);
    persistSettings();
    Undo.push("Resize");
  });
});

initResizablePanels();
initMenubarHover();
initDragDropPreview();
restoreSettings();
applyInfoBarVisibility();
applyUndoPanelVisibility();
initZoomBar();
initWheelZoom();
initPixelHover();
initColorPicker();
initPanning();
initUndoPanelResize();
renderEffectsList();
renderEffectPanel();
Undo.reset("Ready");
Undo.render();

elements.undoBtn?.addEventListener("click", () => Undo.undo());
elements.redoBtn?.addEventListener("click", () => Undo.redo());

elements.menuToggleInfoBar?.addEventListener("click", () => {
  state.view.showInfoBar = !state.view.showInfoBar;
  applyInfoBarVisibility();
  persistSettings();
});

elements.menuToggleUndo?.addEventListener("click", () => {
  state.view.showUndoPanel = !state.view.showUndoPanel;
  applyUndoPanelVisibility();
  persistSettings();
});

elements.presetSaveBtn?.addEventListener("click", () => {
  const name = (elements.presetName?.value ?? "").trim();
  if (!name) return;
  const store = loadPresetsStore();
  store.presets[name] = getEffectsConfig();
  savePresetsStore(store);
  renderPresetsList();
  Undo.push(`Save preset: ${name}`);
});

window.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  if (e.key.toLowerCase() === "z" && !e.shiftKey) {
    e.preventDefault();
    Undo.undo();
  } else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
    e.preventDefault();
    Undo.redo();
  }
});

// Restore last image (best-effort)
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed?.dataUrl?.startsWith?.("data:image/")) {
      setImageFromDataUrl(parsed.dataUrl, {
        name: parsed.name,
        type: parsed.type,
        size: parsed.size,
      });
    }
  }
} catch {
  // ignore
}

// Restore last autosaved effects config (best-effort)
restoreAutosaveEffectsConfig();
window.setInterval(autosaveEffectsConfig, 15000);
