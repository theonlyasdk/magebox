import { EffectRegistry } from "./effects/registry.js";
import { WebGLRenderer } from "./gl/webgl-renderer.js";
import { clampNumber, lerp, generateSplineLUT } from "./utils/math.js";
import { rgbToHex } from "./utils/color.js";
import { Settings } from "./utils/settings.js";
import { MageboxUI } from "./magebox-ui.js";

const elements = {
  fileInput: document.getElementById("file-input"),
  saveProjectBtn: document.getElementById("save-project-btn"),
  downloadBtn: document.getElementById("download-btn"),
  menuUpload: document.getElementById("menu-upload"),
  menuDownload: document.getElementById("menu-download"),
  menuSaveProject: document.getElementById("menu-save-project"),
  menuLoadProject: document.getElementById("menu-load-project"),
  menuUndo: document.getElementById("menu-undo"),
  menuRedo: document.getElementById("menu-redo"),
  menuResetEffects: document.getElementById("menu-reset-effects"),
  menuImageProperties: document.getElementById("menu-image-properties"),
  menuLayerNew: document.getElementById("menu-layer-new"),
  menuLayerImport: document.getElementById("menu-layer-import"),
  menuLayerDuplicate: document.getElementById("menu-layer-duplicate"),
  menuLayerRename: document.getElementById("menu-layer-rename"),
  menuLayerSelectAll: document.getElementById("menu-layer-select-all"),
  menuLayerMoveUp: document.getElementById("menu-layer-move-up"),
  menuLayerMoveDown: document.getElementById("menu-layer-move-down"),
  menuLayerDelete: document.getElementById("menu-layer-delete"),
  menuToolTransform: document.getElementById("menu-tool-transform"),
  menuToggleTheme: document.getElementById("menu-toggle-theme"),
  menuToggleInfoBar: document.getElementById("menu-toggle-infobar"),
  menuToggleUndo: document.getElementById("menu-toggle-undo"),
  menuToggleCheckerboard: document.getElementById("menu-toggle-checkerboard"),
  menuSoloEffect: document.getElementById("menu-solo-effect"),
  menuAbout: document.getElementById("menu-about"),
  previewArea: document.getElementById("preview-area"),
  previewInfoBar: document.getElementById("preview-infobar"),
  zoomOut: document.getElementById("zoom-out"),
  zoomIn: document.getElementById("zoom-in"),
  zoomReset: document.getElementById("zoom-reset"),
  zoomSlider: document.getElementById("zoom-slider"),
  zoomLevel: document.getElementById("zoom-level"),
  pixelInfo: document.getElementById("pixel-info"),
  colorHoverIndicator: document.getElementById("color-hover-indicator"),
  brushIndicator: document.getElementById("brush-indicator"),
  undoPanel: document.getElementById("undo-panel"),
  undoResizer: document.getElementById("undo-resizer"),
  undoList: document.getElementById("undo-list"),
  undoBtn: document.getElementById("undo-btn"),
  redoBtn: document.getElementById("redo-btn"),
  panelLeft: document.getElementById("panel-left"),
  panelMiddle: document.getElementById("panel-middle"),
  panelRight: document.getElementById("panel-right"),
  leftTabEffects: document.getElementById("left-tab-effects"),
  leftTabLayers: document.getElementById("left-tab-layers"),
  effectsPane: document.getElementById("effects-pane"),
  layersPane: document.getElementById("layers-pane"),
  panelResizers: Array.from(document.querySelectorAll(".panel-resizer")),
  effectsList: document.getElementById("effects-list"),
  effectsCount: document.getElementById("effects-count"),
  layersList: document.getElementById("layers-list"),
  layersCount: document.getElementById("layers-count"),
  importLayersBtn: document.getElementById("import-layers-btn"),
  newLayerBtn: document.getElementById("new-layer-btn"),
  emptyState: document.getElementById("empty-state"),
  renderError: document.getElementById("render-error"),
  viewErrorBtn: document.getElementById("view-error-btn"),
  errorModalEl: document.getElementById("error-modal"),
  errorText: document.getElementById("error-text"),
  canvasWrap: document.getElementById("canvas-wrap"),
  canvas: document.getElementById("preview-canvas"),
  transformOverlay: document.getElementById("transform-overlay"),
  previewTitle: document.getElementById("preview-title"),
  imageMeta: document.getElementById("image-meta"),
  panelTitle: document.getElementById("panel-title"),
  soloContainer: document.getElementById("solo-container"),
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
  ipSizePreset: document.getElementById("ip-size-preset"),

  projectModalEl: document.getElementById("project-modal"),
  projectModalTitle: document.getElementById("project-modal-title"),
  projectSaveArea: document.getElementById("project-save-area"),
  projectLoadArea: document.getElementById("project-load-area"),
  projectName: document.getElementById("project-name"),
  projectSaveBtn: document.getElementById("project-save-btn"),
  projectDownloadJsonBtn: document.getElementById("project-download-json-btn"),
  projectList: document.getElementById("project-list"),
  projectImportBtn: document.getElementById("project-import-btn"),
  projectImportFile: document.getElementById("project-import-file"),

  experimentalTransformModalEl: document.getElementById("experimental-transform-modal"),
  experimentalTransformDontShow: document.getElementById("experimental-transform-dont-show"),
  experimentalTransformConfirmBtn: document.getElementById("experimental-transform-confirm-btn"),


  importConfirmModalEl: document.getElementById("import-confirm-modal"),
  importDontShow: document.getElementById("import-dont-show"),
  importKeepBtn: document.getElementById("import-keep-btn"),
  importResizeBtn: document.getElementById("import-resize-btn"),

  aboutModalEl: document.getElementById("about-modal"),
  exportModalEl: document.getElementById("export-modal"),
  exportName: document.getElementById("export-name"),
  exportFormat: document.getElementById("export-format"),
  exportQualityWrap: document.getElementById("export-quality-wrap"),
  exportQuality: document.getElementById("export-quality"),
  exportQualityLabel: document.getElementById("export-quality-label"),
  exportNote: document.getElementById("export-note"),
  exportConfirmBtn: document.getElementById("export-confirm-btn"),

  colorPopover: document.getElementById("color-popover"),
};

const state = {
  file: null,
  fileName: null,
  layers: [],
  selectedLayerId: null,
  selectedLayerIds: [],
  selectedEffectId: EffectRegistry[0]?.id ?? null,
  projectName: null,
  settings: {
    sampling: "linear", // preview smoothing: "linear" | "nearest"
    interpolation: "lanczos3", // download resize: nearest|bilinear|bicubic|bicubicSharper|lanczos3
    output: {
      width: null,
      height: null,
      lockAspect: true,
    },
    skipExperimentalTransformWarning: false,
  },
  view: {
    zoomFactor: 1, // 1.0 == 100% (actual size)
    showInfoBar: true,
    panX: 0,
    panY: 0,
    showUndoPanel: false,
    activeTool: null,
    transformDrag: null,
    transformPreview: {
      raf: 0,
      canvas: null,
    },
    colorPicker: null, // { effectId, key }
    maskDrawing: { active: false, mode: 'add', size: 20, effectId: null, paramKey: null },
    soloEffectId: null,
  },
  effects: Object.fromEntries(
    EffectRegistry.map((effect) => [
      effect.id,
      { enabled: false, params: JSON.parse(JSON.stringify(effect.defaultParams ?? {})) },
    ]),
  ),
};

const STORAGE_KEY = "magebox:lastImage:v1";
const PROJECTS_KEY = "magebox:projects:v1";
const PAN_SENSITIVITY = 1;
const ZOOM_SENSITIVITY = 0.012;
let gpuRenderer = null;

try {
  gpuRenderer = new WebGLRenderer();
} catch (error) {
  console.error("WebGL renderer unavailable. This app requires WebGL support.", error);
  throw error;
}

function createDefaultEffectsState() {
  return Object.fromEntries(
    EffectRegistry.map((effect) => [
      effect.id,
      { enabled: false, params: JSON.parse(JSON.stringify(effect.defaultParams ?? {})) },
    ]),
  );
}

function createLayerId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random());
}

function createLayerFromImage(image, meta = {}, options = {}) {
  const width = options.width ?? image.naturalWidth ?? image.width ?? 1;
  const height = options.height ?? image.naturalHeight ?? image.height ?? 1;
  return {
    id: options.id ?? createLayerId(),
    name: meta.name ?? options.name ?? "Layer",
    image,
    visible: options.visible ?? true,
    opacity: options.opacity ?? 1,
    blendMode: options.blendMode ?? "source-over",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width,
    height,
    enabled: options.enabled ?? true,
    effects: options.effects ? options.effects : createDefaultEffectsState(),
    meta: {
      name: meta.name ?? options.name ?? null,
      type: meta.type ?? null,
      size: meta.size ?? null,
      dataUrl: options.dataUrl ?? null,
    },
  };
}

function createTransparentCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width || 1));
  canvas.height = Math.max(1, Math.round(height || 1));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  try {
    canvas.naturalWidth = canvas.width;
    canvas.naturalHeight = canvas.height;
  } catch {
    // ignore if the host object rejects expando writes
  }
  return canvas;
}

function getLayerById(layerId) {
  return state.layers.find((layer) => layer.id === layerId) ?? null;
}

function getLayerSelectionIds() {
  const validIds = new Set(state.layers.map((layer) => layer.id));
  const ids = Array.from(new Set(state.selectedLayerIds ?? [])).filter((id) => validIds.has(id));
  if (ids.length) return ids;
  const selected = state.selectedLayerId && validIds.has(state.selectedLayerId) ? [state.selectedLayerId] : [];
  if (selected.length) return selected;
  const fallback = state.layers[state.layers.length - 1]?.id ?? null;
  return fallback ? [fallback] : [];
}

function getSelectedLayer() {
  return getLayerById(state.selectedLayerId) ?? getLayerById(getLayerSelectionIds()[0]) ?? state.layers[0] ?? null;
}

function getSelectedLayers() {
  return getLayerSelectionIds().map((id) => getLayerById(id)).filter(Boolean);
}

function syncSelectedLayerState(nextIds, primaryId = null) {
  const validIds = new Set(state.layers.map((layer) => layer.id));
  const ids = Array.from(new Set(nextIds ?? [])).filter((id) => validIds.has(id));
  state.selectedLayerIds = ids;
  const primary = primaryId && ids.includes(primaryId) ? primaryId : ids[ids.length - 1] ?? ids[0] ?? null;
  state.selectedLayerId = primary;
  return ids;
}

function setSelectedLayers(layerIds, { primaryId = null, persist = true } = {}) {
  syncSelectedLayerState(layerIds, primaryId);
  renderLayersList();
  renderEffectsList();
  renderEffectPanel();
  updatePreviewTitle();
  updateImageMeta();
  syncImagePropsUi();
  renderTransformOverlay();
  if (persist) persistSettings();
}

function setSelectedLayer(layerId) {
  setSelectedLayers(layerId ? [layerId] : [], { primaryId: layerId });
}

function selectLayerByClick(layerId, shiftKey = false) {
  if (!shiftKey) {
    setSelectedLayer(layerId);
    return;
  }
  const layers = state.layers;
  if (!layers.length) return;
  const clickedIndex = layers.findIndex((layer) => layer.id === layerId);
  if (clickedIndex === -1) return;
  const currentIds = getLayerSelectionIds();
  const anchorId = state.selectedLayerId ?? currentIds[currentIds.length - 1] ?? layerId;
  const anchorIndex = layers.findIndex((layer) => layer.id === anchorId);
  if (anchorIndex === -1) {
    setSelectedLayer(layerId);
    return;
  }
  const [start, end] = anchorIndex < clickedIndex ? [anchorIndex, clickedIndex] : [clickedIndex, anchorIndex];
  const ids = layers.slice(start, end + 1).map((layer) => layer.id);
  setSelectedLayers(ids, { primaryId: layerId });
}

function ensureLayerSelection() {
  if (!state.layers.length) {
    state.selectedLayerId = null;
    state.selectedLayerIds = [];
    return null;
  }
  const ids = getLayerSelectionIds();
  syncSelectedLayerState(ids, state.selectedLayerId ?? ids[ids.length - 1] ?? null);
  return getSelectedLayer();
}

function getActiveEffectState(effectId, layer = getSelectedLayer()) {
  if (!layer) return null;
  return layer.effects?.[effectId] ?? null;
}

function getEnabledEffectEntries(layer = getSelectedLayer()) {
  if (!layer) return [];
  if (state.view.soloEffectId) {
    const effect = EffectRegistry.find((e) => e.id === state.view.soloEffectId);
    if (effect) {
      return [
        {
          effect,
          enabled: true,
          params: layer.effects?.[effect.id]?.params ?? {},
          layer,
        },
      ];
    }
  }

  return EffectRegistry.map((effect) => ({
    effect,
    enabled: layer.effects?.[effect.id]?.enabled,
    params: layer.effects?.[effect.id]?.params ?? {},
    layer,
  })).filter((entry) => entry.enabled);
}

function getLayerEffectStateSnapshot(layer) {
  return {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    enabled: layer.enabled,
    imageDataUrl: layer.meta?.dataUrl ?? null,
    meta: layer.meta
      ? {
          name: layer.meta.name ?? null,
          type: layer.meta.type ?? null,
          size: layer.meta.size ?? null,
        }
      : null,
    effects: JSON.parse(JSON.stringify(layer.effects ?? createDefaultEffectsState())),
  };
}

function cloneLayerForRestore(layer, snapshot) {
  const merged = {
    ...layer,
    ...snapshot,
    meta: { ...(layer.meta ?? {}), ...(snapshot.meta ?? {}) },
    effects: snapshot.effects ? JSON.parse(JSON.stringify(snapshot.effects)) : createDefaultEffectsState(),
  };
  merged.width = snapshot.width ?? layer.width ?? merged.image?.naturalWidth ?? merged.image?.width ?? 1;
  merged.height = snapshot.height ?? layer.height ?? merged.image?.naturalHeight ?? merged.image?.height ?? 1;
  return merged;
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function hydrateLayerSnapshot(snapshot, existingLayer = null) {
  if (existingLayer) {
    return cloneLayerForRestore(existingLayer, snapshot);
  }

  let image = null;
  if (snapshot.imageDataUrl) {
    image = await loadImageFromDataUrl(snapshot.imageDataUrl);
  } else {
    image = createTransparentCanvas(snapshot.width ?? 1, snapshot.height ?? 1);
  }

  return {
    id: snapshot.id ?? createLayerId(),
    name: snapshot.name ?? "Layer",
    image,
    visible: snapshot.visible !== false,
    opacity: snapshot.opacity ?? 1,
    blendMode: snapshot.blendMode ?? "source-over",
    x: snapshot.x ?? 0,
    y: snapshot.y ?? 0,
    width: snapshot.width ?? image.naturalWidth ?? image.width ?? 1,
    height: snapshot.height ?? image.naturalHeight ?? image.height ?? 1,
    enabled: snapshot.enabled !== false,
    effects: snapshot.effects ? JSON.parse(JSON.stringify(snapshot.effects)) : createDefaultEffectsState(),
    meta: {
      ...(snapshot.meta ?? {}),
      dataUrl: snapshot.imageDataUrl ?? snapshot.meta?.dataUrl ?? null,
    },
  };
}

function scaleLayersToCanvas(oldW, oldH, newW, newH) {
  if (!oldW || !oldH || !newW || !newH) return;
  const scaleX = newW / oldW;
  const scaleY = newH / oldH;
  for (const layer of state.layers) {
    layer.x *= scaleX;
    layer.y *= scaleY;
    layer.width *= scaleX;
    layer.height *= scaleY;
  }
}

function persistSettings() {
  Settings.save({
    theme: document.documentElement.dataset.bsTheme ?? "dark",
    showInfoBar: state.view.showInfoBar,
    showUndoPanel: state.view.showUndoPanel,
    showCheckerboard: state.view.showCheckerboard,
    importAction: state.settings.importAction,
    zoomFactor: state.view.zoomFactor,
    panX: state.view.panX,
    panY: state.view.panY,
    sampling: state.settings.sampling,
    interpolation: state.settings.interpolation,
    output: state.settings.output,
    selectedEffectId: state.selectedEffectId,
    selectedLayerId: state.selectedLayerId,
    selectedLayerIds: state.selectedLayerIds,
    undoPanelHeight: elements.undoPanel ? elements.undoPanel.getBoundingClientRect().height : null,
    skipExperimentalTransformWarning: state.settings.skipExperimentalTransformWarning,
  });
}

function updatePreviewTitle() {
  if (!elements.previewTitle) return;
  elements.previewTitle.textContent = "Preview";
}

function restoreSettings() {
  const s = Settings.load();
  document.documentElement.dataset.bsTheme = s.theme ?? "dark";
  state.view.showInfoBar = Boolean(s.showInfoBar);
  state.view.showUndoPanel = Boolean(s.showUndoPanel);
  state.view.showCheckerboard = s.showCheckerboard !== false;
  state.settings.importAction = s.importAction ?? "ask";
  state.view.zoomFactor = clampNumber(Number(s.zoomFactor ?? 1), 0.01, 30);
  state.view.panX = clampNumber(Number(s.panX ?? 0), -100000, 100000);
  state.view.panY = clampNumber(Number(s.panY ?? 0), -100000, 100000);
  state.settings.skipExperimentalTransformWarning = Boolean(s.skipExperimentalTransformWarning);
  if (s.sampling) state.settings.sampling = s.sampling;
  if (s.interpolation) state.settings.interpolation = s.interpolation;
  if (s.output) state.settings.output = { ...state.settings.output, ...s.output };
  if (s.selectedEffectId) state.selectedEffectId = s.selectedEffectId;
  if (s.selectedLayerId) state.selectedLayerId = s.selectedLayerId;
  if (Array.isArray(s.selectedLayerIds)) state.selectedLayerIds = s.selectedLayerIds;
  if (elements.undoPanel && s.undoPanelHeight) {
    elements.undoPanel.style.height = `${Math.max(60, Math.round(s.undoPanelHeight))}px`;
  }
}

const Undo = (() => {
  const entries = [];
  let index = -1;
  let restoring = false;
  const MAX = 100;
  const UNDO_KEY = "magebox:undo:v1";

  function snapshot() {
    return JSON.parse(
      JSON.stringify({
        layers: state.layers.map((layer) => getLayerEffectStateSnapshot(layer)),
        selectedLayerId: state.selectedLayerId,
        selectedLayerIds: state.selectedLayerIds,
        selectedEffectId: state.selectedEffectId,
        settings: state.settings,
      }),
    );
  }

  async function applySnapshot(snap) {
    restoring = true;

    if (snap?.layers && Array.isArray(snap.layers)) {
      const byId = new Map(state.layers.map((layer) => [layer.id, layer]));
      state.layers = await Promise.all(
        snap.layers.map((layerSnap) => hydrateLayerSnapshot(layerSnap, byId.get(layerSnap.id) ?? null)),
      );
    }

    state.settings = { ...state.settings, ...(snap.settings ?? {}) };
    state.selectedLayerId = snap.selectedLayerId ?? state.selectedLayerId ?? state.layers[0]?.id ?? null;
    state.selectedLayerIds = Array.isArray(snap.selectedLayerIds)
      ? snap.selectedLayerIds
      : state.selectedLayerId
        ? [state.selectedLayerId]
        : [];
    state.selectedEffectId = snap.selectedEffectId ?? state.selectedEffectId;
    restoring = false;
  }

  function saveToStorage() {
    if (restoring) return;
    try {
      localStorage.setItem(UNDO_KEY, JSON.stringify({ entries, index }));
    } catch {
      // ignore
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(UNDO_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.entries)) return false;
      entries.length = 0;
      entries.push(...parsed.entries);
      index = Number(parsed.index);
      if (entries[index]) {
        applySnapshot(entries[index].snap).then(() => {
          afterRestore();
          render();
        }).catch((err) => {
          console.error("Undo restore failed:", err);
          restoring = false;
          afterRestore();
          render();
        });
      }
      return true;
    } catch {
      return false;
    }
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
    saveToStorage();
    persistSettings();
    render();
  }

  function reset(label = "Ready", { fresh = false } = {}) {
    if (!fresh && loadFromStorage()) {
      afterRestore();
      render();
      return;
    }
    entries.length = 0;
    index = -1;
    if (fresh) {
      try {
        localStorage.removeItem(UNDO_KEY);
      } catch {
        // ignore
      }
    }
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
    applySnapshot(entries[index].snap).then(() => {
      saveToStorage();
      afterRestore();
      render();
    }).catch((err) => {
      console.error("Undo restore failed:", err);
      restoring = false;
      afterRestore();
      render();
    });
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
    ensureLayerSelection();
    renderLayersList();
    renderEffectPanel();
    renderEffectsList();
    updatePreviewTitle();
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

function buildFilterString(layer = getSelectedLayer()) {
  const parts = [];
  for (const effect of EffectRegistry) {
    const effectState = getActiveEffectState(effect.id, layer);
    if (!effectState?.enabled) continue;
    if (typeof effect.getFilter === "function") {
      const segment = effect.getFilter(effectState.params);
      if (segment) parts.push(segment);
    }
  }
  return parts.length ? parts.join(" ") : "none";
}

function applyPixelEffects(ctx, width, height, layer = getSelectedLayer()) {
  const enabled = getEnabledEffectEntries(layer);
  const pixelEffects = enabled.filter((e) => typeof e.effect.applyImageData === "function");
  if (!pixelEffects.length) return;

  let imageData = ctx.getImageData(0, 0, width, height);
  for (const effect of pixelEffects) {
    imageData =
      effect.effect.applyImageData(imageData, width, height, effect.params) ?? imageData;
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

function resampleImageData(srcImageData, dw, dh, method, resizeMethod = "fill") {
  const sw = srcImageData.width;
  const sh = srcImageData.height;
  const src = srcImageData.data;
  const dstImageData = new ImageData(dw, dh);
  const dst = dstImageData.data;

  let scaleX = sw / dw;
  let scaleY = sh / dh;
  let offsetX = 0;
  let offsetY = 0;

  if (resizeMethod === "fill") {
    const imgAspect = sw / sh;
    const targetAspect = dw / dh;
    if (imgAspect > targetAspect) {
      // Image is wider than target: crop sides
      scaleY = sh / dh;
      scaleX = scaleY;
      offsetX = (sw - dw * scaleX) / 2;
    } else {
      // Image is taller than target: crop top/bottom
      scaleX = sw / dw;
      scaleY = scaleX;
      offsetY = (sh - dh * scaleY) / 2;
    }
  }

  const radius =
    method === "lanczos3" ? 3 : method === "bicubic" || method === "bicubicSharper" ? 2 : 1;

  for (let y = 0; y < dh; y++) {
    const sy = (y + 0.5) * scaleY - 0.5 + offsetY;
    const y0 = Math.floor(sy);
    for (let x = 0; x < dw; x++) {
      const sx = (x + 0.5) * scaleX - 0.5 + offsetX;
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

function getLayerTransformEffect(layer = getSelectedLayer()) {
  if (!layer) return null;
  const effect = EffectRegistry.find((entry) => entry.id === "transform");
  const effectState = layer.effects?.transform;
  if (!effect || !effectState?.enabled) return null;
  return { effect, params: effectState.params ?? {} };
}

function getOrCreateLayerTransformEffect(layer = getSelectedLayer()) {
  if (!layer) return null;
  const effect = EffectRegistry.find((entry) => entry.id === "transform");
  if (!effect) return null;
  if (!layer.effects) layer.effects = createDefaultEffectsState();
  if (!layer.effects.transform) {
    layer.effects.transform = {
      enabled: true,
      params: JSON.parse(JSON.stringify(effect.defaultParams ?? {})),
    };
  }
  if (!layer.effects.transform.params) {
    layer.effects.transform.params = JSON.parse(JSON.stringify(effect.defaultParams ?? {}));
  }
  return { effect, params: layer.effects.transform.params, state: layer.effects.transform };
}

function cloneTransformParams(params = {}) {
  return JSON.parse(JSON.stringify(params ?? {}));
}

function createAffineMatrix(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) {
  return { a, b, c, d, e, f };
}

function multiplyAffine(m1, m2) {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

function translateAffine(tx, ty) {
  return createAffineMatrix(1, 0, 0, 1, tx, ty);
}

function rotateAffine(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return createAffineMatrix(c, s, -s, c, 0, 0);
}

function scaleAffine(sx, sy) {
  return createAffineMatrix(sx, 0, 0, sy, 0, 0);
}

function skewAffine(skewXDeg, skewYDeg) {
  const skx = Math.tan(((Number(skewXDeg) || 0) * Math.PI) / 180);
  const sky = Math.tan(((Number(skewYDeg) || 0) * Math.PI) / 180);
  return createAffineMatrix(1, sky, skx, 1, 0, 0);
}

function invertAffine(m) {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-9) return null;
  return {
    a: m.d / det,
    b: -m.b / det,
    c: -m.c / det,
    d: m.a / det,
    e: (m.c * m.f - m.d * m.e) / det,
    f: (m.b * m.e - m.a * m.f) / det,
  };
}

function transformPoint(m, x, y) {
  return {
    x: m.a * x + m.c * y + m.e,
    y: m.b * x + m.d * y + m.f,
  };
}

function composeLayerTransformMatrix(params = {}, width = 1, height = 1) {
  const anchorX = clampNumber(Number(params.anchorX ?? 0.5), 0, 1);
  const anchorY = clampNumber(Number(params.anchorY ?? 0.5), 0, 1);
  const offsetX = Number(params.offsetX ?? 0);
  const offsetY = Number(params.offsetY ?? 0);
  const rotation = ((Number(params.rotation ?? 0) * Math.PI) / 180) || 0;
  const scaleX = Math.max(0.0001, Math.abs(Number(params.scaleX ?? 1))) * (params.flipX ? -1 : 1);
  const scaleY = Math.max(0.0001, Math.abs(Number(params.scaleY ?? 1))) * (params.flipY ? -1 : 1);

  let m = createAffineMatrix();
  m = multiplyAffine(m, translateAffine(width * anchorX + offsetX, height * anchorY + offsetY));
  m = multiplyAffine(m, rotateAffine(rotation));
  m = multiplyAffine(m, skewAffine(params.skewX ?? 0, params.skewY ?? 0));
  m = multiplyAffine(m, scaleAffine(scaleX, scaleY));
  m = multiplyAffine(m, translateAffine(-width * anchorX, -height * anchorY));
  return m;
}

function getTransformAnchorPoint(params = {}, width = 1, height = 1) {
  return {
    x: width * clampNumber(Number(params.anchorX ?? 0.5), 0, 1),
    y: height * clampNumber(Number(params.anchorY ?? 0.5), 0, 1),
  };
}

function getHandleLocalPoint(role, width, height, anchorPoint) {
  const center = anchorPoint ?? { x: width * 0.5, y: height * 0.5 };
  switch (role) {
    case "nw":
      return { x: 0, y: 0 };
    case "n":
      return { x: center.x, y: 0 };
    case "ne":
      return { x: width, y: 0 };
    case "e":
      return { x: width, y: center.y };
    case "se":
      return { x: width, y: height };
    case "s":
      return { x: center.x, y: height };
    case "sw":
      return { x: 0, y: height };
    case "w":
      return { x: 0, y: center.y };
    default:
      return { x: center.x, y: center.y };
  }
}

function getOppositeHandleLocalPoint(role, width, height, anchorPoint) {
  const oppositeRole =
    {
      nw: "se",
      n: "s",
      ne: "sw",
      e: "w",
      se: "nw",
      s: "n",
      sw: "ne",
      w: "e",
    }[role] ?? role;
  return getHandleLocalPoint(oppositeRole, width, height, anchorPoint);
}

function solvePinnedTransformOffset(params, pinnedLocalPoint, pinnedWorldPoint, width, height) {
  const zeroOffsetParams = {
    ...params,
    offsetX: 0,
    offsetY: 0,
  };
  const matrix = composeLayerTransformMatrix(zeroOffsetParams, width, height);
  const baseWorldPoint = transformPoint(matrix, pinnedLocalPoint.x, pinnedLocalPoint.y);
  return {
    offsetX: pinnedWorldPoint.x - baseWorldPoint.x,
    offsetY: pinnedWorldPoint.y - baseWorldPoint.y,
  };
}

function zoomToSliderValue(zoom) {
  const value = clampNumber(Number(zoom ?? 1), 0.01, 30);
  if (value <= 1) {
    return Math.round(((value - 0.01) / 0.99) * 160);
  }
  return Math.round(160 + ((value - 1) / 29) * 40);
}

function sliderValueToZoom(value) {
  const slider = clampNumber(Number(value ?? 160), 0, 200);
  if (slider <= 160) {
    return 0.01 + (slider / 160) * 0.99;
  }
  return 1 + ((slider - 160) / 40) * 29;
}

function getCurrentTransformLayer() {
  const layer = getSelectedLayer();
  if (!layer) return null;
  return getOrCreateLayerTransformEffect(layer);
}

function activateTransformTool() {
  const layer = getSelectedLayer();
  if (!layer) return;
  const transform = getOrCreateLayerTransformEffect(layer);
  if (!transform) return;
  transform.state.enabled = true;
  state.selectedEffectId = "transform";
  state.view.activeTool = "transform";
  elements.menuToolTransform?.classList.add("active");
  renderEffectsList();
  renderEffectPanel();
  renderTransformOverlay();
  requestRender();
  persistSettings();
}

function deactivateTransformTool() {
  state.view.activeTool = null;
  elements.menuToolTransform?.classList.remove("active");
  renderTransformOverlay();
  requestRender();
  persistSettings();
}

function isTransformToolActive() {
  return state.view.activeTool === "transform";
}

function canvasPointFromEvent(e) {
  if (!elements.canvas) return null;
  const rect = elements.canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = ((e.clientX - rect.left) / rect.width) * elements.canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * elements.canvas.height;
  return { x, y };
}

function getTransformPreviewCanvas() {
  const overlay = elements.transformOverlay;
  if (!overlay) return null;
  if (state.view.transformPreview?.canvas && overlay.contains(state.view.transformPreview.canvas)) {
    return state.view.transformPreview.canvas;
  }
  const canvas = document.createElement("canvas");
  canvas.className = "transform-preview-canvas";
  canvas.style.position = "absolute";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "0";
  state.view.transformPreview.canvas = canvas;
  return canvas;
}

function syncTransformPreviewPlacement() {
  const overlay = elements.transformOverlay;
  const previewCanvas = state.view.transformPreview?.canvas;
  const previewDrag = state.view.transformDrag;
  const mainCanvas = elements.canvas;
  if (!overlay || !previewCanvas || !mainCanvas || !previewDrag || !isTransformToolActive()) {
    if (previewCanvas) previewCanvas.classList.add("d-none");
    return;
  }

  const canvasRect = mainCanvas.getBoundingClientRect();
  const areaRect = elements.previewArea.getBoundingClientRect();
  previewCanvas.classList.remove("d-none");
  previewCanvas.style.left = `${canvasRect.left - areaRect.left}px`;
  previewCanvas.style.top = `${canvasRect.top - areaRect.top}px`;
  previewCanvas.style.width = `${canvasRect.width}px`;
  previewCanvas.style.height = `${canvasRect.height}px`;
}

function renderTransformPreviewCanvas() {
  const drag = state.view.transformDrag;
  const previewCanvas = getTransformPreviewCanvas();
  const layer = getSelectedLayer();
  if (!drag || !previewCanvas || !layer || !elements.canvas) return;

  const currentParams = cloneTransformParams(layer.effects?.transform?.params ?? drag.startParams ?? {});
  const width = Math.max(1, elements.canvas.width);
  const height = Math.max(1, elements.canvas.height);
  previewCanvas.width = width;
  previewCanvas.height = height;

  const active = getOrCreateLayerTransformEffect(layer);
  if (active?.state?.params) {
    active.state.params = currentParams;
  }
  renderLayerToCanvas(layer, previewCanvas, width, height, {
    previewSampling: state.settings.sampling,
    interpolation: state.settings.interpolation,
  });
  syncTransformPreviewPlacement();
}

function resetTransformInteractionState({ clearTool = false } = {}) {
  state.view.transformDrag = null;
  const previewCanvas = state.view.transformPreview?.canvas;
  if (previewCanvas) previewCanvas.classList.add("d-none");
  elements.transformOverlay?.classList.remove("is-dragging");
  if (clearTool) {
    state.view.activeTool = null;
    elements.menuToolTransform?.classList.remove("active");
  }
}

function renderTransformBackdrop(layerId) {
  if (!elements.canvas || !layerId) return;
  drawToCanvas(elements.canvas, {
    maxWidth: 1200,
    maxHeight: 800,
    excludeLayerId: layerId,
    suppressEmptyState: true,
  });
}

function scheduleTransformPreviewRender() {
  const drag = state.view.transformDrag;
  if (!drag) return;
  if (state.view.transformPreview?.raf) return;
  state.view.transformPreview.raf = requestAnimationFrame(() => {
    state.view.transformPreview.raf = 0;
    renderTransformPreviewCanvas();
  });
}

function renderTransformOverlay() {
  const overlay = elements.transformOverlay;
  if (!overlay || !elements.previewArea || !elements.canvas || !state.layers.length || !isTransformToolActive()) {
    if (overlay) {
      overlay.innerHTML = "";
      overlay.classList.add("d-none");
    }
    const previewCanvas = state.view.transformPreview?.canvas;
    if (previewCanvas) previewCanvas.classList.add("d-none");
    return;
  }

  const layer = getSelectedLayer();
  const transform = getCurrentTransformLayer();
  if (!layer || !transform?.state?.enabled) {
    overlay.innerHTML = "";
    overlay.classList.add("d-none");
    return;
  }

  const canvas = elements.canvas;
  const canvasRect = canvas.getBoundingClientRect();
  const areaRect = elements.previewArea.getBoundingClientRect();
  if (canvasRect.width <= 0 || canvasRect.height <= 0) {
    overlay.innerHTML = "";
    overlay.classList.add("d-none");
    const previewCanvas = state.view.transformPreview?.canvas;
    if (previewCanvas) previewCanvas.classList.add("d-none");
    return;
  }

  const matrix = composeLayerTransformMatrix(transform.params, layer.width, layer.height);
  const corners = [
    transformPoint(matrix, 0, 0),
    transformPoint(matrix, layer.width, 0),
    transformPoint(matrix, layer.width, layer.height),
    transformPoint(matrix, 0, layer.height),
  ];
  const scaleX = canvasRect.width / canvas.width;
  const scaleY = canvasRect.height / canvas.height;
  const toScreen = (point) => ({
    x: canvasRect.left - areaRect.left + (point.x + layer.x) * scaleX,
    y: canvasRect.top - areaRect.top + (point.y + layer.y) * scaleY,
  });
  const screenCorners = corners.map(toScreen);
  const midTop = {
    x: (screenCorners[0].x + screenCorners[1].x) / 2,
    y: (screenCorners[0].y + screenCorners[1].y) / 2,
  };
  const midRight = {
    x: (screenCorners[1].x + screenCorners[2].x) / 2,
    y: (screenCorners[1].y + screenCorners[2].y) / 2,
  };
  const midBottom = {
    x: (screenCorners[2].x + screenCorners[3].x) / 2,
    y: (screenCorners[2].y + screenCorners[3].y) / 2,
  };
  const midLeft = {
    x: (screenCorners[3].x + screenCorners[0].x) / 2,
    y: (screenCorners[3].y + screenCorners[0].y) / 2,
  };
  const rotateHandle = { x: midTop.x, y: midTop.y - 28 };
  const points = screenCorners.map((point) => `${point.x},${point.y}`).join(" ");

  overlay.innerHTML = `
    <svg class="transform-outline" viewBox="0 0 ${elements.previewArea.clientWidth} ${elements.previewArea.clientHeight}" preserveAspectRatio="none" aria-hidden="true">
      <polygon points="${points}" class="transform-outline-polygon" data-role="box"></polygon>
      <line x1="${midTop.x}" y1="${midTop.y}" x2="${rotateHandle.x}" y2="${rotateHandle.y}" class="transform-rotate-line"></line>
    </svg>
    <div class="transform-handle transform-rotate-handle" data-role="rotate" style="left:${rotateHandle.x}px;top:${rotateHandle.y}px;"></div>
    <div class="transform-handle corner" data-role="nw" style="left:${screenCorners[0].x}px;top:${screenCorners[0].y}px;"></div>
    <div class="transform-handle corner" data-role="ne" style="left:${screenCorners[1].x}px;top:${screenCorners[1].y}px;"></div>
    <div class="transform-handle corner" data-role="se" style="left:${screenCorners[2].x}px;top:${screenCorners[2].y}px;"></div>
    <div class="transform-handle corner" data-role="sw" style="left:${screenCorners[3].x}px;top:${screenCorners[3].y}px;"></div>
    <div class="transform-handle edge" data-role="n" style="left:${midTop.x}px;top:${midTop.y}px;"></div>
    <div class="transform-handle edge" data-role="e" style="left:${midRight.x}px;top:${midRight.y}px;"></div>
    <div class="transform-handle edge" data-role="s" style="left:${midBottom.x}px;top:${midBottom.y}px;"></div>
    <div class="transform-handle edge" data-role="w" style="left:${midLeft.x}px;top:${midLeft.y}px;"></div>
  `;
  const previewCanvas = getTransformPreviewCanvas();
  if (state.view.transformDrag) {
    if (previewCanvas.parentElement !== overlay) overlay.prepend(previewCanvas);
    syncTransformPreviewPlacement();
  } else if (previewCanvas) {
    previewCanvas.classList.add("d-none");
  }
  overlay.classList.remove("d-none");
}

function initTransformTool() {
  const overlay = elements.transformOverlay;
  if (!overlay || !elements.previewArea || !elements.canvas) return;

  const clampScale = (value) => clampNumber(value, 0.05, 20);

  const startDrag = (role, e) => {
    if (!isTransformToolActive()) return;
    if (e.button === 1) return;
    const layer = getSelectedLayer();
    const transform = getCurrentTransformLayer();
    const point = canvasPointFromEvent(e);
    if (!layer || !transform || !point) return;

    e.preventDefault();
    e.stopPropagation();

    const canvas = elements.canvas;
    const params = cloneTransformParams(transform.params);
    const matrix = composeLayerTransformMatrix(params, canvas.width, canvas.height);
    const inverseMatrix = invertAffine(matrix);
    const anchorPoint = getTransformAnchorPoint(params, canvas.width, canvas.height);
    const centerPoint = transformPoint(matrix, anchorPoint.x, anchorPoint.y);
    const handleLocalPoint = getHandleLocalPoint(role, canvas.width, canvas.height, anchorPoint);
    const pinnedLocalPoint = getOppositeHandleLocalPoint(role, canvas.width, canvas.height, anchorPoint);
    const pinnedWorldPoint = transformPoint(matrix, pinnedLocalPoint.x, pinnedLocalPoint.y);

    state.view.transformDrag = {
      role,
      startPoint: point,
      startParams: params,
      matrix,
      inverseMatrix,
      centerX: centerPoint.x,
      centerY: centerPoint.y,
      anchorPoint,
      handleLocalPoint,
      pinnedLocalPoint,
      pinnedWorldPoint,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      layerId: layer.id,
    };
    overlay.classList.add("is-dragging");
    renderTransformBackdrop(layer.id);
    renderTransformOverlay();
    scheduleTransformPreviewRender();
  };

  const updateDrag = (e) => {
    const drag = state.view.transformDrag;
    if (!drag) return;
    const layer = getSelectedLayer();
    const transform = getCurrentTransformLayer();
    const point = canvasPointFromEvent(e);
    if (!layer || !transform || !point) return;

    const next = cloneTransformParams(drag.startParams);
    const dx = point.x - drag.startPoint.x;
    const dy = point.y - drag.startPoint.y;
    const role = drag.role;

    if (role === "move" || role === "box") {
      next.offsetX = Number(drag.startParams.offsetX ?? 0) + dx;
      next.offsetY = Number(drag.startParams.offsetY ?? 0) + dy;
    } else if (role === "rotate") {
      const startAngle = Math.atan2(drag.startPoint.y - drag.centerY, drag.startPoint.x - drag.centerX);
      const nextAngle = Math.atan2(point.y - drag.centerY, point.x - drag.centerX);
      next.rotation = Number(drag.startParams.rotation ?? 0) + ((nextAngle - startAngle) * 180) / Math.PI;
    } else {
      const currentLocal = drag.inverseMatrix
        ? transformPoint(drag.inverseMatrix, point.x, point.y)
        : drag.handleLocalPoint;
      const axisX = role.includes("e") ? 1 : role.includes("w") ? -1 : 0;
      const axisY = role.includes("s") ? 1 : role.includes("n") ? -1 : 0;
      const resizeOrigin = e.altKey ? drag.anchorPoint : drag.pinnedLocalPoint;
      const startSpan = {
        x: (drag.handleLocalPoint?.x ?? resizeOrigin.x) - resizeOrigin.x,
        y: (drag.handleLocalPoint?.y ?? resizeOrigin.y) - resizeOrigin.y,
      };
      const currentSpan = {
        x: currentLocal.x - resizeOrigin.x,
        y: currentLocal.y - resizeOrigin.y,
      };
      const ratioX =
        axisX !== 0 && Math.abs(startSpan.x) > 0.0001
          ? Math.max(0.05, Math.abs(currentSpan.x / startSpan.x))
          : 1;
      const ratioY =
        axisY !== 0 && Math.abs(startSpan.y) > 0.0001
          ? Math.max(0.05, Math.abs(currentSpan.y / startSpan.y))
          : 1;

      if (e.ctrlKey) {
        const rad = -((Number(drag.startParams.rotation ?? 0) * Math.PI) / 180);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const localDx = dx * cos - dy * sin;
        const localDy = dx * sin + dy * cos;
        if (axisX !== 0) {
          next.skewY = clampNumber(Number(drag.startParams.skewY ?? 0) + (localDx / Math.max(1, drag.canvasWidth)) * 180 * axisX, -89, 89);
        }
        if (axisY !== 0) {
          next.skewX = clampNumber(Number(drag.startParams.skewX ?? 0) + (localDy / Math.max(1, drag.canvasHeight)) * 180 * axisY, -89, 89);
        }
      } else {
        const baseScaleX = Number(drag.startParams.scaleX ?? 1);
        const baseScaleY = Number(drag.startParams.scaleY ?? 1);

        if (e.shiftKey && (axisX !== 0 || axisY !== 0)) {
          const factor =
            axisX !== 0 && axisY !== 0
              ? (ratioX + ratioY) * 0.5
              : axisX !== 0
                ? ratioX
                : ratioY;
          const nextScale = clampScale(baseScaleX * factor);
          next.scaleX = nextScale;
          next.scaleY = nextScale;
        } else {
          if (axisX !== 0) {
            next.scaleX = clampScale(baseScaleX * ratioX);
          }
          if (axisY !== 0) {
            next.scaleY = clampScale(baseScaleY * ratioY);
          }
        }

        if (!e.altKey) {
          const pinnedOffset = solvePinnedTransformOffset(
            next,
            drag.pinnedLocalPoint,
            drag.pinnedWorldPoint,
            drag.canvasWidth,
            drag.canvasHeight,
          );
          next.offsetX = pinnedOffset.offsetX;
          next.offsetY = pinnedOffset.offsetY;
        }
      }
    }

    transform.state.params = next;
    renderEffectPanel();
    renderTransformOverlay();
    scheduleTransformPreviewRender();
    persistSettings();
  };

  const endDrag = () => {
    const drag = state.view.transformDrag;
    if (!drag) return;
    resetTransformInteractionState();
    const layer = getSelectedLayer();
    if (layer && layer.id === drag.layerId) {
      const effect = getOrCreateLayerTransformEffect(layer);
      if (effect?.state?.enabled) {
        Undo.push(`Transform layer: ${layer.name}`);
      }
    }
    renderTransformOverlay();
    requestRender();
  };

  overlay.addEventListener("mousedown", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const role = target.getAttribute("data-role") || target.closest?.("[data-role]")?.getAttribute("data-role");
    if (!role) {
      if (isTransformToolActive()) commitTransform();
      return;
    }
    startDrag(role, e);
  });

  overlay.addEventListener("mousemove", updateDrag);
  window.addEventListener("mousemove", updateDrag);
  window.addEventListener("mouseup", endDrag);

  overlay.addEventListener("click", (e) => {
    if (!isTransformToolActive()) return;
    e.preventDefault();
    e.stopPropagation();
  });
}

function applyCanvasTransform(targetCanvas, sourceCanvas, params = {}) {
  const w = targetCanvas.width || sourceCanvas.width;
  const h = targetCanvas.height || sourceCanvas.height;
  const ctx = targetCanvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.save();

  const anchorX = clampNumber(Number(params.anchorX ?? 0.5), 0, 1);
  const anchorY = clampNumber(Number(params.anchorY ?? 0.5), 0, 1);
  const offsetX = Number(params.offsetX ?? 0);
  const offsetY = Number(params.offsetY ?? 0);
  const rotation = ((Number(params.rotation ?? 0) * Math.PI) / 180) || 0;
  const scaleX = Math.max(0.0001, Math.abs(Number(params.scaleX ?? 1))) * (params.flipX ? -1 : 1);
  const scaleY = Math.max(0.0001, Math.abs(Number(params.scaleY ?? 1))) * (params.flipY ? -1 : 1);
  const skewX = Math.tan(((Number(params.skewX ?? 0) * Math.PI) / 180) || 0);
  const skewY = Math.tan(((Number(params.skewY ?? 0) * Math.PI) / 180) || 0);

  ctx.translate(w * anchorX + offsetX, h * anchorY + offsetY);
  ctx.rotate(rotation);
  ctx.transform(1, skewY, skewX, 1, 0, 0);
  ctx.scale(scaleX, scaleY);
  ctx.translate(-w * anchorX, -h * anchorY);
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.restore();
}

function renderLayerToCanvas(
  layer,
  targetCanvas,
  width,
  height,
  { previewSampling = state.settings.sampling, interpolation = state.settings.interpolation } = {},
) {
  targetCanvas.width = width;
  targetCanvas.height = height;

  if (!layer?.enabled || layer.visible === false || !layer.image) {
    const clearCtx = targetCanvas.getContext("2d");
    clearCtx.clearRect(0, 0, width, height);
    return targetCanvas;
  }

  const layerEffects = getEnabledEffectEntries(layer);
  const transformEffect = getLayerTransformEffect(layer);

  gpuRenderer.renderToCanvas({
    layers: [layer],
    effects: layerEffects,
    width,
    height,
    previewSampling,
    interpolation,
    targetCanvas,
  });
  return targetCanvas;
}

function drawToCanvas(
  targetCanvas,
  {
    maxWidth,
    maxHeight,
    overrideWidth = null,
    overrideHeight = null,
    excludeLayerId = null,
    suppressEmptyState = false,
    previewSampling = state.settings.sampling,
    interpolation = state.settings.sampling === "nearest" ? "nearest" : "bilinear",
  } = {},
) {
  if (!state.layers || state.layers.length === 0) {
    if (targetCanvas?.getContext) {
      const emptyWidth = suppressEmptyState && targetCanvas === elements.canvas
        ? Math.max(1, targetCanvas.width || state.settings.output.width || 1)
        : 1;
      const emptyHeight = suppressEmptyState && targetCanvas === elements.canvas
        ? Math.max(1, targetCanvas.height || state.settings.output.height || 1)
        : 1;
      targetCanvas.width = emptyWidth;
      targetCanvas.height = emptyHeight;
      const ctx = targetCanvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, emptyWidth, emptyHeight);
    }

    if (targetCanvas === elements.canvas) {
      if (elements.renderError) {
        elements.renderError.classList.add("d-none");
        elements.renderError.classList.remove("d-flex");
      }
      if (suppressEmptyState) {
        if (elements.canvasWrap) elements.canvasWrap.classList.remove("d-none");
        if (elements.emptyState) elements.emptyState.classList.add("d-none");
      } else {
        if (elements.canvasWrap) elements.canvasWrap.classList.add("d-none");
        if (elements.emptyState) elements.emptyState.classList.remove("d-none");
      }
    }
    return;
  }

  try {
    const baseLayer = getSelectedLayer() ?? state.layers[0];
    const img = baseLayer?.image ?? state.layers[0].image;

    let w;
    let h;
    if (overrideWidth && overrideHeight) {
      w = Math.max(1, Math.round(overrideWidth));
      h = Math.max(1, Math.round(overrideHeight));
    } else {
      const baseW = state.settings.output.width ?? img.naturalWidth;
      const baseH = state.settings.output.height ?? img.naturalHeight;
      const scale = maxWidth && maxHeight ? Math.min(1, maxWidth / baseW, maxHeight / baseH) : 1;
      w = Math.max(1, Math.round(baseW * scale));
      h = Math.max(1, Math.round(baseH * scale));
    }

    targetCanvas.width = w;
    targetCanvas.height = h;

    const ctx = targetCanvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    for (const layer of state.layers) {
      if (excludeLayerId && layer.id === excludeLayerId) continue;
      if (!layer.enabled || layer.visible === false) continue;
      const layerCanvas = createCanvas(w, h);
      renderLayerToCanvas(layer, layerCanvas, w, h, { previewSampling, interpolation });
      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.globalCompositeOperation = layer.blendMode ?? "source-over";
      ctx.drawImage(layerCanvas, 0, 0);
      ctx.restore();
    }

    if (targetCanvas === elements.canvas) {
      targetCanvas.style.imageRendering = state.settings.sampling === "nearest" ? "pixelated" : "auto";
      applyZoomStyles();
    }
    if (elements.emptyState) elements.emptyState.classList.add("d-none");
    if (elements.renderError) {
      elements.renderError.classList.add("d-none");
      elements.renderError.classList.remove("d-flex");
    }
    if (elements.canvasWrap) elements.canvasWrap.classList.remove("d-none");
  } catch (err) {
    console.error("Render failed:", err);
    lastRenderError = err?.message || String(err);
    if (elements.renderError) {
      elements.renderError.classList.remove("d-none");
      elements.renderError.classList.add("d-flex");
    }
    if (elements.canvasWrap) elements.canvasWrap.classList.add("d-none");
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
    renderTransformOverlay();
  });
}

function renderEffectsList() {
  elements.effectsList.innerHTML = "";
  elements.effectsCount.textContent = `(${EffectRegistry.length})`;
  const layer = ensureLayerSelection();

  if (!layer) {
    const empty = document.createElement("div");
    empty.className = "p-3 text-body-secondary small";
    empty.textContent = "Import a layer to edit its effects.";
    elements.effectsList.appendChild(empty);
    return;
  }

  for (const effect of EffectRegistry) {
    const effectState = getActiveEffectState(effect.id, layer);
    if (!effectState) continue;
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
    badge.className = `badge mb-badge-toggle ${effectState.enabled ? "text-bg-primary" : "mb-badge-off"}`;
    badge.textContent = effectState.enabled ? "On" : "Off";
    badge.role = "button";
    badge.tabIndex = 0;
    badge.title = "Toggle effect";

    const toggle = () => {
      effectState.enabled = !effectState.enabled;
      
      // Ensure defaults are fully applied when first turning on an effect
      if (effectState.enabled) {
        effectState.params = {
          ...JSON.parse(JSON.stringify(effect.defaultParams ?? {})),
          ...effectState.params
        };
      }

      requestRender();
      renderEffectsList();
      if (state.selectedEffectId === effect.id) {
        renderEffectPanel();
      }
      const verb = effectState.enabled ? "Apply" : "Remove";
      Undo.push(`${verb} ${effect.name} on ${layer.name}`);
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
      persistSettings();
    });

    elements.effectsList.appendChild(button);
  }
}

function renderEffectPanel() {
  const layer = ensureLayerSelection();
  if (!layer) {
    elements.panelTitle.textContent = "Properties";
    elements.effectEnabled.checked = false;
    elements.effectControls.innerHTML = `<div class="text-body-secondary p-3">Import a layer to edit effects.</div>`;
    if (elements.soloContainer) elements.soloContainer.innerHTML = "";
    return;
  }

  const effect = EffectRegistry.find((e) => e.id === state.selectedEffectId);
  if (!effect) {
    elements.panelTitle.textContent = layer.name;
    elements.effectEnabled.checked = false;
    elements.effectControls.innerHTML = `<div class="text-body-secondary p-3">Select an effect on the left.</div>`;
    return;
  }

  const activeId = document.activeElement?.id;
  const selectionStart =
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement
      ? document.activeElement.selectionStart
      : null;
  const selectionEnd =
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement
      ? document.activeElement.selectionEnd
      : null;

  const effectState = getActiveEffectState(effect.id, layer);
  elements.panelTitle.textContent = effect.name;
  elements.effectEnabled.checked = Boolean(effectState?.enabled);

  if (elements.soloContainer) {
    elements.soloContainer.innerHTML = "";
    elements.soloContainer.className = "d-flex align-items-center gap-2";

    const isSolo = state.view.soloEffectId === effect.id;
    const badge = document.createElement("span");
    badge.className = `badge mb-align-middle d-inline-flex align-items-center justify-content-center ${
      isSolo ? "text-bg-warning" : "mb-badge-solo-off"
    }`;
    badge.textContent = "Solo";
    badge.style.height = "20px";
    badge.title = isSolo ? "Turn off Solo mode" : "Isolate this effect (temporarily disable others)";
    badge.role = "button";
    badge.style.cursor = "pointer";
    badge.onclick = () => {
      state.view.soloEffectId = isSolo ? null : effect.id;
      renderEffectPanel();
      requestRender();
    };
    elements.soloContainer.appendChild(badge);

    const resetAllBtn = document.createElement("button");
    resetAllBtn.type = "button";
    resetAllBtn.className =
      "btn btn-link p-0 text-decoration-none small text-body-secondary reset-control-btn mb-align-middle";
    resetAllBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise" style="font-size: 1rem;"></i>';
    resetAllBtn.title = `Reset all ${effect.name} parameters to default`;
    resetAllBtn.onclick = () => {
      if (effect.defaultParams && effectState) {
        effectState.params = JSON.parse(JSON.stringify(effect.defaultParams));
        renderEffectPanel();
        requestRender();
        Undo.push(`Reset all ${effect.name} params on ${layer.name}`);
      }
    };
    elements.soloContainer.appendChild(resetAllBtn);
  }

  function ensureEnabled() {
    if (!effectState || effectState.enabled) return;
    effectState.enabled = true;
    elements.effectEnabled.checked = true;
    renderEffectsList();
    Undo.push(`Apply ${effect.name} on ${layer.name}`);
  }

  const frag = document.createDocumentFragment();

  if (effect.description) {
    const descContainer = document.createElement("div");
    descContainer.className = "p-3";
    const p = document.createElement("div");
    p.className = "text-body-secondary small";
    p.textContent = effect.description;
    descContainer.appendChild(p);
    frag.appendChild(descContainer);

    const hr = document.createElement("hr");
    hr.className = "m-0";
    frag.appendChild(hr);
  }

  const controlsContainer = document.createElement("div");
  controlsContainer.className = "p-3";

  for (const param of effect.params ?? []) {
    const key = param.key;
    const value = effectState?.params?.[key];

    if (param.show_on) {
      const actual = effectState?.params?.[param.show_on.key];
      if (actual !== param.show_on.value) continue;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "mb-3";

    const header = document.createElement("div");
    header.className = "d-flex justify-content-between align-items-center mb-1";

    const labelGroup = document.createElement("div");
    labelGroup.className = "d-flex align-items-center gap-2";

    const label = document.createElement("label");
    label.className = "form-label m-0";
    label.htmlFor = `control-${effect.id}-${key}`;
    label.textContent = param.label;
    labelGroup.appendChild(label);

    if (param.type === "text" && effectState?.errors?.[key]) {
      const warn = document.createElement("i");
      warn.className = "bi bi-exclamation-triangle-fill text-warning";
      warn.title = effectState.errors[key];
      labelGroup.appendChild(warn);
    }

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn btn-link p-0 text-decoration-none small text-body-secondary reset-control-btn";
    resetBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i>';
    resetBtn.title = "Reset to default";
    resetBtn.style.fontSize = "0.8rem";
    resetBtn.addEventListener("click", () => {
      const defaultValue = effect.defaultParams?.[key];
      if (defaultValue !== undefined && effectState) {
        effectState.params[key] = JSON.parse(JSON.stringify(defaultValue));
        renderEffectPanel();
        requestRender();
        Undo.push(`Reset ${param.label} on ${layer.name}`);
      }
    });

    header.appendChild(labelGroup);
    header.appendChild(resetBtn);
    wrapper.appendChild(header);

    if (param.type === "select") {
      const selectGroup = document.createElement("div");
      selectGroup.className = "d-flex align-items-center gap-1";

      const select = document.createElement("select");
      select.className = "form-select form-select-sm";
      select.id = `control-${effect.id}-${key}`;
      for (const opt of param.options ?? []) {
        const option = document.createElement("option");
        option.value = String(opt.value);
        option.textContent = opt.label ?? String(opt.value);
        select.appendChild(option);
      }
      select.value = String(value ?? (param.options?.[0]?.value ?? ""));

      const cycle = (dir) => {
        const options = param.options ?? [];
        if (options.length < 2 || !effectState) return;
        let idx = options.findIndex((o) => String(o.value) === select.value);
        idx = (idx + dir + options.length) % options.length;
        const nextVal = String(options[idx].value);
        select.value = nextVal;
        effectState.params[key] = nextVal;
        ensureEnabled();
        renderEffectPanel();
        requestRender();
        Undo.push(`Adjust ${effect.name} on ${layer.name}`);
      };

      const btnPrev = document.createElement("button");
      btnPrev.type = "button";
      btnPrev.className = "btn btn-link p-0 text-decoration-none text-body-secondary reset-control-btn";
      btnPrev.innerHTML = '<i class="bi bi-chevron-left"></i>';
      btnPrev.addEventListener("click", () => cycle(-1));

      const btnNext = document.createElement("button");
      btnNext.type = "button";
      btnNext.className = "btn btn-link p-0 text-decoration-none text-body-secondary reset-control-btn";
      btnNext.innerHTML = '<i class="bi bi-chevron-right"></i>';
      btnNext.addEventListener("click", () => cycle(1));

      select.addEventListener("change", () => {
        if (!effectState) return;
        effectState.params[key] = select.value;
        ensureEnabled();
        renderEffectPanel();
        requestRender();
        Undo.push(`Adjust ${effect.name} on ${layer.name}`);
      });

      selectGroup.appendChild(btnPrev);
      selectGroup.appendChild(select);
      selectGroup.appendChild(btnNext);
      wrapper.appendChild(selectGroup);
    } else if (param.type === "color") {
      const group = document.createElement("div");
      group.className = "btn-group w-100 color-split";

      const chooseBtn = document.createElement("button");
      chooseBtn.type = "button";
      chooseBtn.className = "btn btn-outline-secondary d-flex align-items-center justify-content-between";
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
        if (!effectState) return;
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
          value: String(effectState?.params?.[key] ?? "#ff0000"),
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

      wrapper.appendChild(group);
    } else if (param.type === "text") {
      const input = document.createElement("input");
      input.className = "form-control form-control-sm";
      input.id = `control-${effect.id}-${key}`;
      input.type = "text";
      input.value = String(value ?? "");
      input.spellcheck = false;
      input.addEventListener("input", () => {
        if (!effectState) return;
        effectState.params[key] = input.value;
        ensureEnabled();
        requestRender();
      });
      input.addEventListener("change", () => {
        ensureEnabled();
        Undo.push(`Adjust ${effect.name} on ${layer.name}`);
      });
      wrapper.appendChild(input);
    } else if (param.type === "switch") {
      const switchWrap = document.createElement("div");
      switchWrap.className = "form-check form-switch";

      const input = document.createElement("input");
      input.className = "form-check-input";
      input.type = "checkbox";
      input.id = `control-${effect.id}-${key}`;
      input.checked = Boolean(value);

      const switchLabel = document.createElement("label");
      switchLabel.className = "form-check-label small text-body-secondary";
      switchLabel.htmlFor = input.id;
      switchLabel.textContent = param.description ?? "";

      input.addEventListener("change", () => {
        if (!effectState) return;
        effectState.params[key] = input.checked;
        ensureEnabled();
        requestRender();
        Undo.push(`Toggle ${param.label} on ${layer.name}`);
      });

      switchWrap.appendChild(input);
      switchWrap.appendChild(switchLabel);
      wrapper.appendChild(switchWrap);
    } else if (param.type === "mask") {
      const toolbar = document.createElement("div");
      toolbar.className = "btn-group btn-group-sm w-100 mt-2 mb-2";

      const drawState = state.view.maskDrawing || { active: false, mode: "add", size: 20 };
      state.view.maskDrawing = drawState;

      const btnAdd = document.createElement("button");
      btnAdd.className = `btn btn-outline-primary ${
        drawState.active && drawState.mode === "add" ? "active" : ""
      }`;
      btnAdd.innerHTML = '<i class="bi bi-pencil-fill me-1"></i>Keep';
      btnAdd.onclick = () => {
        const wasActive = drawState.active && drawState.mode === "add";
        drawState.active = !wasActive;
        drawState.mode = "add";
        drawState.effectId = effect.id;
        drawState.paramKey = key;
        applyMaskDrawingCursor();
        renderEffectPanel();
      };

      const btnSub = document.createElement("button");
      btnSub.className = `btn btn-outline-danger ${
        drawState.active && drawState.mode === "sub" ? "active" : ""
      }`;
      btnSub.innerHTML = '<i class="bi bi-eraser-fill me-1"></i>Remove';
      btnSub.onclick = () => {
        const wasActive = drawState.active && drawState.mode === "sub";
        drawState.active = !wasActive;
        drawState.mode = "sub";
        drawState.effectId = effect.id;
        drawState.paramKey = key;
        applyMaskDrawingCursor();
        renderEffectPanel();
      };

      const btnClear = document.createElement("button");
      btnClear.className = "btn btn-outline-secondary";
      btnClear.innerHTML = '<i class="bi bi-trash-fill me-1"></i>Clear';
      btnClear.onclick = () => {
        if (!effectState) return;
        effectState.params[key] = null;
        drawState.active = false;
        applyMaskDrawingCursor();
        if (elements.brushIndicator) elements.brushIndicator.classList.add("d-none");
        renderEffectPanel();
        requestRender();
        Undo.push(`Clear ${param.label} on ${layer.name}`);
      };

      toolbar.appendChild(btnAdd);
      toolbar.appendChild(btnSub);
      toolbar.appendChild(btnClear);
      wrapper.appendChild(toolbar);

      if (drawState.active) {
        const sizeInput = document.createElement("input");
        sizeInput.type = "range";
        sizeInput.className = "form-range mt-1";
        sizeInput.min = "5";
        sizeInput.max = "100";
        sizeInput.value = String(drawState.size);
        sizeInput.oninput = () => {
          drawState.size = Number(sizeInput.value);
        };

        const sizeLabel = document.createElement("div");
        sizeLabel.className = "x-small text-body-secondary text-center";
        sizeLabel.textContent = `Brush Size: ${drawState.size}px`;
        sizeInput.addEventListener("input", () => {
          sizeLabel.textContent = `Brush Size: ${sizeInput.value}px`;
        });

        wrapper.appendChild(sizeLabel);
        wrapper.appendChild(sizeInput);
      }
    } else if (param.type === "lights") {
      const editorWrap = document.createElement("div");
      editorWrap.className = "mt-2";

      new MageboxUI.LightsEditor({
        container: editorWrap,
        lights: Array.isArray(value) ? value : param.default ?? [],
        onChange: (newLights) => {
          if (!effectState) return;
          effectState.params[key] = newLights.map((l) => ({ ...l }));
          ensureEnabled();
          requestRender();
        },
      });

      wrapper.appendChild(editorWrap);
    } else if (param.type === "regions") {
      const editorWrap = document.createElement("div");
      editorWrap.className = "mt-2";

      new MageboxUI.RegionsEditor({
        container: editorWrap,
        regions: Array.isArray(value) ? value : param.default ?? [],
        onChange: (newRegions) => {
          if (!effectState) return;
          effectState.params[key] = newRegions.map((r) => ({ ...r }));
          ensureEnabled();
          requestRender();
        },
      });

      wrapper.appendChild(editorWrap);
    } else if (param.type === "curves") {
      const editorWrap = document.createElement("div");
      editorWrap.className = "mt-2 d-flex justify-content-center";

      const editor = new MageboxUI.CurvesEditor({
        container: editorWrap,
        points: Array.isArray(value) ? value : param.default ?? [
          [0, 0],
          [1, 1],
        ],
        color: param.color ?? "#0d6efd",
        onChange: (newPoints) => {
          if (!effectState) return;
          effectState.params[key] = newPoints.map((p) => [...p]);
          ensureEnabled();
          requestRender();
        },
      });

      if (layer.image) {
        const img = layer.image;
        const tempCanvas = document.createElement("canvas");
        const targetW = 128;
        const targetH = Math.max(1, Math.round(targetW * (img.naturalHeight / img.naturalWidth)));
        tempCanvas.width = targetW;
        tempCanvas.height = targetH;
        const tctx = tempCanvas.getContext("2d");
        tctx.drawImage(img, 0, 0, targetW, targetH);
        const data = tctx.getImageData(0, 0, targetW, targetH).data;

        const hist = new Uint32Array(256);
        const channelIndex = param.key === "red" ? 0 : param.key === "green" ? 1 : param.key === "blue" ? 2 : -1;

        for (let i = 0; i < data.length; i += 4) {
          let val;
          if (channelIndex === -1) {
            val = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          } else {
            val = data[i + channelIndex];
          }
          hist[val]++;
        }
        editor.setHistogram(hist);
      }

      wrapper.appendChild(editorWrap);
    } else if (param.min === 0 && param.max === 1 && param.step === 1) {
      const checkWrap = document.createElement("div");
      checkWrap.className = "form-check";

      const input = document.createElement("input");
      input.className = "form-check-input";
      input.type = "checkbox";
      input.id = `control-${effect.id}-${key}`;
      input.checked = Number(value) === 1;

      const checkLabel = document.createElement("label");
      checkLabel.className = "form-check-label small text-body-secondary";
      checkLabel.htmlFor = input.id;
      checkLabel.textContent = param.description ?? "Enable";

      input.addEventListener("change", () => {
        if (!effectState) return;
        effectState.params[key] = input.checked ? 1 : 0;
        ensureEnabled();
        requestRender();
        Undo.push(`Toggle ${param.label} on ${layer.name}`);
      });

      checkWrap.appendChild(input);
      checkWrap.appendChild(checkLabel);
      wrapper.appendChild(checkWrap);
    } else {
      const input = document.createElement("input");
      input.className = "form-range";
      input.id = `control-${effect.id}-${key}`;
      input.type = param.type ?? "range";
      if (param.min != null) input.min = String(param.min);
      if (param.max != null) input.max = String(param.max);
      if (param.step != null) input.step = String(param.step);
      const transform = param.transform;
      if (transform?.type === "exp") {
        const base = Number(transform.base ?? 10);
        const pv = clampNumber(
          Number(value ?? 1),
          transform.paramMin ?? 0.0001,
          transform.paramMax ?? 1e9,
        );
        input.value = String(Math.log(pv) / Math.log(base));
      } else {
        input.value = String(value ?? param.min ?? 0);
      }

      const help = document.createElement("div");
      help.className = "small text-body-secondary d-flex justify-content-between";
      const current = document.createElement("span");
      const unit = param.unit ? ` ${param.unit}` : "";
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
      const minText = param.min != null ? param.min : "";
      const maxText = param.max != null ? param.max : "";
      range.textContent = minText !== "" && maxText !== "" ? `${minText}–${maxText}${unit}` : "";
      help.appendChild(current);
      help.appendChild(range);

      input.addEventListener("input", () => {
        current.textContent = formatValue();
        const numericValue = Number(input.value);
        if (!effectState) return;
        if (transform?.type === "exp") {
          const base = Number(transform.base ?? 10);
          const actual = Math.pow(base, numericValue);
          effectState.params[key] = clampNumber(
            actual,
            transform.paramMin ?? 0,
            transform.paramMax ?? actual,
          );
        } else {
          const min = param.min != null ? Number(param.min) : -Infinity;
          const max = param.max != null ? Number(param.max) : Infinity;
          effectState.params[key] = clampNumber(numericValue, min, max);
        }
        ensureEnabled();
        requestRender();
      });
      input.addEventListener("change", () => {
        ensureEnabled();
        Undo.push(`Adjust ${effect.name} on ${layer.name}`);
      });

      wrapper.appendChild(input);
      wrapper.appendChild(help);
    }
    controlsContainer.appendChild(wrapper);
  }

  if (!effect.params?.length) {
    const p = document.createElement("div");
    p.className = "text-body-secondary";
    p.textContent = "No controls for this effect.";
    controlsContainer.appendChild(p);
  }

  frag.appendChild(controlsContainer);

  elements.effectControls.innerHTML = "";
  elements.effectControls.appendChild(frag);

  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) {
      el.focus();
      if (
        selectionStart !== null &&
        selectionEnd !== null &&
        (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      ) {
        try {
          el.setSelectionRange(selectionStart, selectionEnd);
        } catch {
          // ignore
        }
      }
    }
  }
}

function setLeftPanelView(view) {
  const showEffects = view === "effects";
  
  if (showEffects) {
    elements.leftTabEffects?.classList.add("btn-primary");
    elements.leftTabEffects?.classList.remove("btn-outline-secondary", "active");
    elements.leftTabLayers?.classList.add("btn-outline-secondary");
    elements.leftTabLayers?.classList.remove("btn-primary", "active");
  } else {
    elements.leftTabEffects?.classList.add("btn-outline-secondary");
    elements.leftTabEffects?.classList.remove("btn-primary", "active");
    elements.leftTabLayers?.classList.add("btn-primary");
    elements.leftTabLayers?.classList.remove("btn-outline-secondary", "active");
  }
  
  elements.effectsPane?.classList.toggle("d-none", !showEffects);
  elements.layersPane?.classList.toggle("d-none", showEffects);
  persistSettings();
}

function renderLayersList() {
  const list = elements.layersList;
  if (!list) return;

  ensureLayerSelection();
  updatePreviewTitle();
  const layers = state.layers;
  elements.layersCount.textContent = `(${layers.length})`;
  list.innerHTML = "";

  const empty = document.getElementById("layers-empty");
  if (empty) {
    const hasLayers = layers.length > 0;
    empty.classList.toggle("d-none", hasLayers);
    empty.classList.toggle("d-flex", !hasLayers);
    empty.classList.toggle("align-items-center", !hasLayers);
    empty.classList.toggle("justify-content-center", !hasLayers);
    empty.classList.toggle("text-center", !hasLayers);
  }
  list.classList.toggle("d-none", layers.length === 0);

  if (!layers.length) return;

  const visibleLayers = [...layers].reverse();
  visibleLayers.forEach((layer, visualIndex) => {
    const actualIndex = layers.findIndex((entry) => entry.id === layer.id);
    const isActive = getLayerSelectionIds().includes(layer.id);
    const isPrimary = state.selectedLayerId === layer.id;

    const row = document.createElement("div");
    row.className = `list-group-item list-group-item-action ${isActive ? "active" : ""}`;
    if (isPrimary) row.classList.add("mb-layer-primary");
    row.style.cursor = "pointer";
    row.setAttribute("aria-selected", isActive ? "true" : "false");

    const top = document.createElement("div");
    top.className = "d-flex align-items-center justify-content-between gap-2";

    const labelWrap = document.createElement("div");
    labelWrap.className = "d-flex align-items-center gap-2 text-truncate";

    const vis = document.createElement("button");
    vis.type = "button";
    vis.className = `btn btn-sm ${layer.visible === false ? "btn-secondary" : "btn-primary"} layer-icon-btn layer-action-btn`;
    vis.innerHTML = layer.visible === false ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    vis.title = layer.visible === false ? "Show layer" : "Hide layer";
    vis.addEventListener("click", (e) => {
      e.stopPropagation();
      layer.visible = layer.visible === false ? true : false;
      requestRender();
      renderLayersList();
      persistSettings();
      Undo.push(`${layer.visible === false ? "Hide" : "Show"} layer: ${layer.name}`);
    });

    const name = document.createElement("span");
    name.className = "text-truncate";
    name.textContent = layer.name || `Layer ${layers.length - visualIndex}`;

    labelWrap.appendChild(vis);
    labelWrap.appendChild(name);

    const actions = document.createElement("div");
    actions.className = "btn-group btn-group-sm";

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "btn btn-secondary layer-icon-btn layer-action-btn";
    upBtn.innerHTML = '<i class="bi bi-arrow-up"></i>';
    upBtn.title = "Bring forward";
    upBtn.disabled = actualIndex === layers.length - 1;
    upBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (actualIndex >= layers.length - 1) return;
      const next = layers[actualIndex + 1];
      layers[actualIndex + 1] = layers[actualIndex];
      layers[actualIndex] = next;
      renderLayersList();
      requestRender();
      persistSettings();
      Undo.push(`Move layer forward: ${layer.name}`);
    });

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "btn btn-secondary layer-icon-btn layer-action-btn";
    downBtn.innerHTML = '<i class="bi bi-arrow-down"></i>';
    downBtn.title = "Send backward";
    downBtn.disabled = actualIndex === 0;
    downBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (actualIndex <= 0) return;
      const prev = layers[actualIndex - 1];
      layers[actualIndex - 1] = layers[actualIndex];
      layers[actualIndex] = prev;
      renderLayersList();
      requestRender();
      persistSettings();
      Undo.push(`Move layer backward: ${layer.name}`);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger layer-icon-btn layer-action-btn";
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
    deleteBtn.title = "Delete layer";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteLayersByIds([layer.id], { skipConfirm: true });
    });

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(deleteBtn);

    top.appendChild(labelWrap);
    top.appendChild(actions);
    row.appendChild(top);

    const sub = document.createElement("div");
    sub.className = "small text-body-secondary mt-1";
    sub.textContent = `${layer.image.naturalWidth}×${layer.image.naturalHeight} • ${Math.round((layer.opacity ?? 1) * 100)}%`;
    row.appendChild(sub);

    row.addEventListener("click", (e) => {
      selectLayerByClick(layer.id, e.shiftKey);
    });

    list.appendChild(row);
  });
}

function addLayerFromFileList(files) {
  const items = Array.from(files ?? []).filter((file) => file?.type?.startsWith("image/"));
  if (!items.length) return;
  const resizeFirst = state.layers.length === 0;
  if (items.length === 1) {
    return setImageFromFile(items[0], { importChoice: resizeFirst ? "resize" : "keep" });
  }
  return (async () => {
    for (const [index, file] of items.entries()) {
      await setImageFromFile(file, {
        importChoice: resizeFirst && index === 0 ? "resize" : "keep",
      });
    }
  })();
}

function createEmptyLayer() {
  commitTransform();
  const baseLayer = getSelectedLayer() ?? state.layers[0];
  const w = state.settings.output.width ?? baseLayer?.image?.naturalWidth ?? 1024;
  const h = state.settings.output.height ?? baseLayer?.image?.naturalHeight ?? 1024;
  if (state.settings.output.width == null) state.settings.output.width = w;
  if (state.settings.output.height == null) state.settings.output.height = h;
  const canvas = createTransparentCanvas(w, h);
  const layer = createLayerFromImage(canvas, { name: "New Layer", type: "image/canvas", size: 0 }, {
    name: "New Layer",
    dataUrl: canvas.toDataURL(),
    visible: true,
    enabled: true,
  });
  state.layers.push(layer);
  setSelectedLayers([layer.id], { primaryId: layer.id });
  requestRender();
  Undo.push(`Add empty layer: ${layer.name}`);
}

function cloneLayerForDuplicate(layer) {
  const source = layer.image;
  const width = source.naturalWidth ?? source.width ?? layer.width ?? 1;
  const height = source.naturalHeight ?? source.height ?? layer.height ?? 1;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, width, height);
  return createLayerFromImage(canvas, { ...layer.meta, name: layer.name }, {
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    enabled: layer.enabled,
    effects: JSON.parse(JSON.stringify(layer.effects ?? createDefaultEffectsState())),
    dataUrl: canvas.toDataURL(),
  });
}

function duplicateSelectedLayers() {
  commitTransform();
  const layers = getSelectedLayers();
  if (!layers.length) return;
  const insertAt = Math.max(0, state.layers.findIndex((layer) => layer.id === layers[layers.length - 1].id) + 1);
  const clones = layers.map((layer) => {
    const clone = cloneLayerForDuplicate(layer);
    clone.name = `${layer.name} copy`;
    return clone;
  });
  state.layers.splice(insertAt, 0, ...clones);
  setSelectedLayers(clones.map((layer) => layer.id), { primaryId: clones[clones.length - 1]?.id ?? null });
  requestRender();
  Undo.push(`Duplicate ${layers.length > 1 ? "layers" : "layer"}`);
}

function renameSelectedLayer() {
  const layer = getSelectedLayer();
  if (!layer) return;
  const next = prompt("Rename layer", layer.name ?? "Layer");
  if (next == null) return;
  const trimmed = next.trim();
  if (!trimmed) return;
  layer.name = trimmed;
  renderLayersList();
  renderEffectPanel();
  updatePreviewTitle();
  updateImageMeta();
  persistSettings();
  Undo.push(`Rename layer: ${layer.name}`);
}

function deleteLayersByIds(layerIds, { skipConfirm = false } = {}) {
  commitTransform();
  const ids = Array.from(new Set(layerIds ?? [])).filter(Boolean);
  if (!ids.length) return;
  if (ids.length > 1 && !skipConfirm) {
    const ok = window.confirm(`Delete ${ids.length} selected layers? This cannot be undone.`);
    if (!ok) return;
  }

  const idSet = new Set(ids);
  const removed = state.layers.filter((layer) => idSet.has(layer.id));
  if (!removed.length) return;
  const deletedSelectedLayer = removed.some((layer) => layer.id === state.selectedLayerId);

  const firstRemovedIndex = state.layers.findIndex((layer) => idSet.has(layer.id));
  const remaining = state.layers.filter((layer) => !idSet.has(layer.id));
  state.layers = remaining;
  const fallbackLayer =
    remaining[Math.min(Math.max(firstRemovedIndex, 0), remaining.length - 1)] ??
    remaining[remaining.length - 1] ??
    null;
  if (deletedSelectedLayer || !fallbackLayer) {
    resetTransformInteractionState({ clearTool: true });
  }
  syncSelectedLayerState(fallbackLayer ? [fallbackLayer.id] : [], fallbackLayer?.id ?? null);
  renderLayersList();
  renderEffectsList();
  renderEffectPanel();
  updatePreviewTitle();
  updateImageMeta();
  requestRender();
  persistSettings();
  Undo.push(`Delete ${removed.length > 1 ? "layers" : "layer"}`);
}

function moveSelectedLayers(direction) {
  const ids = getLayerSelectionIds();
  if (!ids.length || state.layers.length < 2) return;
  const selected = new Set(ids);
  const indexes = state.layers
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => selected.has(layer.id))
    .map(({ index }) => index);
  if (!indexes.length) return;

  const minIndex = Math.min(...indexes);
  const maxIndex = Math.max(...indexes);
  if (direction === "up") {
    if (maxIndex >= state.layers.length - 1) return;
    const block = state.layers.filter((layer) => selected.has(layer.id));
    const remaining = state.layers.filter((layer) => !selected.has(layer.id));
    const insertAt = Math.min(remaining.length, minIndex + 1);
    remaining.splice(insertAt, 0, ...block);
    state.layers = remaining;
  } else {
    if (minIndex <= 0) return;
    const block = state.layers.filter((layer) => selected.has(layer.id));
    const remaining = state.layers.filter((layer) => !selected.has(layer.id));
    const insertAt = Math.max(0, minIndex - 1);
    remaining.splice(insertAt, 0, ...block);
    state.layers = remaining;
  }
  renderLayersList();
  requestRender();
  persistSettings();
  Undo.push(`Move ${ids.length > 1 ? "layers" : "layer"} ${direction}`);
}

function selectAllLayers() {
  if (!state.layers.length) return;
  const ids = state.layers.map((layer) => layer.id);
  setSelectedLayers(ids, { primaryId: ids[ids.length - 1] });
}

function setImageFromFile(file, options = {}) {
  if (!file || !file.type.startsWith("image/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl.startsWith("data:image/")) {
        resolve(null);
        return;
      }
      resolve(
        setImageFromDataUrl(dataUrl, { name: file.name, type: file.type, size: file.size }, options),
      );
    };
    reader.readAsDataURL(file);
  });
}

function updateImageMeta() {
  if (!elements.imageMeta) return;
  if (!state.layers.length) {
    elements.imageMeta.textContent = "";
    return;
  }
  const layer = getSelectedLayer() ?? state.layers[0];
  const w = state.settings.output.width ?? layer.image.naturalWidth;
  const h = state.settings.output.height ?? layer.image.naturalHeight;
  elements.imageMeta.textContent = `${w}×${h} • ${layer.name}`;
}

function setImageFromDataUrl(dataUrl, meta = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      commitTransform();
      try {
        const choice =
          options.importChoice ??
          (options.skipConfirm ? "resize" : await confirmImportAction(img.naturalWidth, img.naturalHeight));

        state.fileName = meta.name ?? state.fileName ?? "image";
        state.file = meta
          ? { name: meta.name, type: meta.type, size: meta.size }
          : state.file;

        const oldW = state.settings.output.width ?? img.naturalWidth;
        const oldH = state.settings.output.height ?? img.naturalHeight;
        const layer = createLayerFromImage(img, meta, {
          name: meta.name ?? "Layer",
          dataUrl,
        });
        state.layers.push(layer);
        setSelectedLayers([layer.id], { primaryId: layer.id, persist: false });

        if (choice === "resize") {
          state.settings.output.width = img.naturalWidth;
          state.settings.output.height = img.naturalHeight;
          scaleLayersToCanvas(oldW, oldH, img.naturalWidth, img.naturalHeight);
          if (elements.ipOutW) elements.ipOutW.value = String(img.naturalWidth);
          if (elements.ipOutH) elements.ipOutH.value = String(img.naturalHeight);
        } else {
          if (state.settings.output.width == null) state.settings.output.width = img.naturalWidth;
          if (state.settings.output.height == null) state.settings.output.height = img.naturalHeight;
        }

        elements.emptyState.classList.add("d-none");
        elements.canvasWrap.classList.remove("d-none");
        elements.downloadBtn.classList.remove("d-none");
        elements.menuDownload?.classList.remove("d-none");
        renderLayersList();
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ dataUrl, name: meta.name, type: meta.type, size: meta.size }),
          );
        } catch {
          // ignore storage quota errors
        }
        updateImageMeta();
        syncImagePropsUi();

        const fit = computeFitZoom();
        state.view.zoomFactor = Math.min(1, fit);
        state.view.panX = 0;
        state.view.panY = 0;
        requestRender();
        if (state.layers.length === 1) {
          Undo.reset("Original image", { fresh: true });
        } else {
          Undo.push(`Import layer: ${layer.name}`);
        }
        resolve(layer);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function getExportBaseName() {
  return (getSelectedLayer()?.name ?? state.fileName ?? "magebox")
    .replace(/\.[^/.]+$/, "")
    .trim() || "magebox";
}

function sanitizeExportFileName(name) {
  return String(name || "magebox")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ");
}

function updateExportQualityUi() {
  if (!elements.exportFormat || !elements.exportQualityWrap) return;
  const format = elements.exportFormat.value;
  const showQuality = format === "jpeg" || format === "webp";
  elements.exportQualityWrap.classList.toggle("d-none", !showQuality);
  if (elements.exportNote) {
    elements.exportNote.classList.toggle("d-none", format !== "gif");
  }
  if (elements.exportQualityLabel && elements.exportQuality) {
    const percent = Math.round(Number(elements.exportQuality.value || 0.92) * 100);
    elements.exportQualityLabel.textContent = `${percent}%`;
  }
}

function openExportDialog() {
  if (!exportModal || !state.layers.length) return;
  if (elements.exportName) elements.exportName.value = getExportBaseName();
  if (elements.exportFormat) elements.exportFormat.value = "png";
  if (elements.exportQuality) elements.exportQuality.value = "0.92";
  updateExportQualityUi();
  exportModal.show();
}

function getExportMimeType(format) {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "png":
    default:
      return "image/png";
  }
}

function flattenCanvasToWhite(sourceCanvas) {
  const canvas = createCanvas(sourceCanvas.width, sourceCanvas.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceCanvas, 0, 0);
  return canvas;
}

function toBlobAsync(canvas, type, quality) {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      resolve(null);
    }
  });
}

function buildGifPalette() {
  const palette = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const r = (i >> 5) & 0x07;
    const g = (i >> 2) & 0x07;
    const b = i & 0x03;
    const offset = i * 3;
    palette[offset] = Math.round((r * 255) / 7);
    palette[offset + 1] = Math.round((g * 255) / 7);
    palette[offset + 2] = Math.round((b * 255) / 3);
  }
  return palette;
}

function encodeGifLzw(indices) {
  const clearCode = 256;
  const endCode = 257;
  const maxCode = 4096;
  let codeSize = 9;
  let nextCode = 258;
  let dict = new Map();

  const bytes = [];
  let buffer = 0;
  let bits = 0;

  const reset = () => {
    dict = new Map();
    codeSize = 9;
    nextCode = 258;
  };

  const writeCode = (code) => {
    buffer |= code << bits;
    bits += codeSize;
    while (bits >= 8) {
      bytes.push(buffer & 0xff);
      buffer >>= 8;
      bits -= 8;
    }
  };

  const maybeGrow = () => {
    if (nextCode === (1 << codeSize) && codeSize < 12) {
      codeSize++;
    }
  };

  reset();
  writeCode(clearCode);

  let prefix = indices[0] ?? 0;
  for (let i = 1; i < indices.length; i++) {
    const symbol = indices[i];
    const key = (prefix << 8) | symbol;
    const found = dict.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }

    writeCode(prefix);
    if (nextCode < maxCode) {
      dict.set(key, nextCode++);
      maybeGrow();
    } else {
      writeCode(clearCode);
      reset();
    }
    prefix = symbol;
  }

  writeCode(prefix);
  writeCode(endCode);
  if (bits > 0) {
    bytes.push(buffer & 0xff);
  }
  return new Uint8Array(bytes);
}

function createGifBlobFromCanvas(sourceCanvas) {
  const canvas = flattenCanvasToWhite(sourceCanvas);
  const ctx = canvas.getContext("2d");
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const palette = buildGifPalette();
  const indices = new Uint8Array(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    indices[p] = ((r >> 5) << 5) | ((g >> 5) << 2) | (b >> 6);
  }

  const lzwData = encodeGifLzw(indices);
  const parts = [new TextEncoder().encode("GIF89a")];

  const pushWord = (value) => {
    parts.push(Uint8Array.of(value & 0xff, (value >> 8) & 0xff));
  };

  pushWord(width);
  pushWord(height);
  parts.push(Uint8Array.of(0xf7, 0x00, 0x00));
  parts.push(palette);

  parts.push(Uint8Array.of(0x2c));
  pushWord(0);
  pushWord(0);
  pushWord(width);
  pushWord(height);
  parts.push(Uint8Array.of(0x00, 0x08));

  for (let offset = 0; offset < lzwData.length; offset += 255) {
    const chunk = lzwData.slice(offset, offset + 255);
    parts.push(Uint8Array.of(chunk.length));
    parts.push(chunk);
  }
  parts.push(Uint8Array.of(0x00, 0x3b));

  return new Blob(parts, { type: "image/gif" });
}

async function exportCurrentImage() {
  if (!state.layers || state.layers.length === 0) return;

  const baseLayer = getSelectedLayer() ?? state.layers[0];
  const outW = Number(state.settings.output.width ?? baseLayer.image.naturalWidth);
  const outH = Number(state.settings.output.height ?? baseLayer.image.naturalHeight);
  const canvas = createCanvas(outW, outH);
  drawToCanvas(canvas, {
    overrideWidth: outW,
    overrideHeight: outH,
    previewSampling: "linear",
    interpolation: state.settings.interpolation || "bilinear",
  });

  const format = elements.exportFormat?.value ?? "png";
  const quality = clampNumber(Number(elements.exportQuality?.value ?? 0.92), 0.1, 1);
  let blob = null;

  if (format === "gif") {
    blob = createGifBlobFromCanvas(canvas);
  } else {
    const outputCanvas = format === "jpeg" ? flattenCanvasToWhite(canvas) : canvas;
    blob = await toBlobAsync(outputCanvas, getExportMimeType(format), format === "jpeg" || format === "webp" ? quality : undefined);
  }

  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const name = sanitizeExportFileName(elements.exportName?.value || getExportBaseName());
  const ext = format === "jpeg" ? "jpg" : format;
  a.download = `${name}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

elements.fileInput.addEventListener("change", (e) => {
  addLayerFromFileList(e.target.files);
  e.target.value = "";
});

elements.effectEnabled.addEventListener("change", () => {
  const effectId = state.selectedEffectId;
  if (!effectId) return;
  const layer = getSelectedLayer();
  if (!layer) return;
  layer.effects[effectId].enabled = elements.effectEnabled.checked;
  requestRender();
  renderEffectsList();
  const effect = EffectRegistry.find((e) => e.id === effectId);
  Undo.push(`${elements.effectEnabled.checked ? "Apply" : "Remove"} ${effect?.name ?? effectId} on ${layer.name}`);
});

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
const projectModal = elements.projectModalEl ? new bootstrap.Modal(elements.projectModalEl) : null;
const errorModal = elements.errorModalEl ? new bootstrap.Modal(elements.errorModalEl) : null;
const importConfirmModal = elements.importConfirmModalEl ? new bootstrap.Modal(elements.importConfirmModalEl) : null;
const experimentalTransformModal = elements.experimentalTransformModalEl ? new bootstrap.Modal(elements.experimentalTransformModalEl) : null;
const aboutModal = elements.aboutModalEl ? new bootstrap.Modal(elements.aboutModalEl) : null;
const exportModal = elements.exportModalEl ? new bootstrap.Modal(elements.exportModalEl) : null;
let lastRenderError = "";

function initExperimentalTransformModal() {
  elements.experimentalTransformConfirmBtn?.addEventListener("click", () => {
    if (elements.experimentalTransformDontShow?.checked) {
      state.settings.skipExperimentalTransformWarning = true;
      persistSettings();
    }
    experimentalTransformModal?.hide();
    activateTransformTool();
  });
}

function initErrorModal() {
  elements.viewErrorBtn?.addEventListener("click", () => {
    if (elements.errorText) elements.errorText.value = lastRenderError;
    errorModal?.show();
  });
}

function initAboutModal() {
  elements.menuAbout?.addEventListener("click", () => {
    aboutModal?.show();
  });
}

function initExportModal() {
  elements.menuDownload?.addEventListener("click", openExportDialog);
  elements.downloadBtn?.addEventListener("click", openExportDialog);
  elements.exportFormat?.addEventListener("change", updateExportQualityUi);
  elements.exportQuality?.addEventListener("input", updateExportQualityUi);
  elements.exportConfirmBtn?.addEventListener("click", async () => {
    await exportCurrentImage();
    exportModal?.hide();
  });
  elements.exportQuality?.addEventListener("input", () => {
    if (elements.exportQualityLabel && elements.exportQuality) {
      elements.exportQualityLabel.textContent = `${Math.round(Number(elements.exportQuality.value || 0.92) * 100)}%`;
    }
  });
}

function initProjectModal() {
  elements.menuSaveProject?.addEventListener("click", () => openProjectModal("save"));
  elements.menuLoadProject?.addEventListener("click", () => openProjectModal("load"));
  elements.saveProjectBtn?.addEventListener("click", async () => {
    openProjectModal("save");
  });
  elements.projectSaveBtn?.addEventListener("click", async () => {
    const name = (elements.projectName?.value ?? "").trim();
    try {
      await saveProjectToLibrary(name || null);
      projectModal?.hide();
    } catch {
      // keep dialog open if storage failed
    }
  });
  elements.projectDownloadJsonBtn?.addEventListener("click", async () => {
    const name = (elements.projectName?.value ?? "").trim();
    await downloadProjectJson(name || null);
  });
  elements.projectImportBtn?.addEventListener("click", () => {
    elements.projectImportFile?.click();
  });
  elements.projectImportFile?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await loadProjectFromFile(file);
    e.target.value = "";
    projectModal?.hide();
  });
}

let pendingImportAction = null;

function initImportConfirmModal() {
  elements.importKeepBtn?.addEventListener("click", () => {
    if (elements.importDontShow?.checked) {
      state.settings.importAction = "keep";
      persistSettings();
    }
    pendingImportAction?.("keep");
    importConfirmModal?.hide();
  });

  elements.importResizeBtn?.addEventListener("click", () => {
    if (elements.importDontShow?.checked) {
      state.settings.importAction = "resize";
      persistSettings();
    }
    pendingImportAction?.("resize");
    importConfirmModal?.hide();
  });
}

async function confirmImportAction(imgW, imgH) {
  const currentW = state.settings.output.width;
  const currentH = state.settings.output.height;

  if (!currentW || !currentH || (currentW === imgW && currentH === imgH)) {
    return "resize";
  }

  if (state.settings.importAction === "resize") return "resize";
  if (state.settings.importAction === "keep") return "keep";

  // Ask user
  return new Promise((resolve) => {
    pendingImportAction = resolve;
    if (elements.importDontShow) elements.importDontShow.checked = false;
    
    const curEl = document.getElementById("import-current-dim");
    const newEl = document.getElementById("import-new-dim");
    if (curEl) curEl.textContent = `${currentW}×${currentH}`;
    if (newEl) newEl.textContent = `${imgW}×${imgH}`;

    importConfirmModal?.show();
  });
}

function syncImagePropsUi() {
  if (!elements.imagePropsModalEl) return;

  const layer = getSelectedLayer() ?? state.layers[0];
  const file = layer?.meta ?? state.file;
  const img = layer?.image;

  elements.ipName.textContent = file?.name ?? "—";
  elements.ipFormat.textContent = file?.type ?? "—";
  elements.ipSize.textContent = file ? humanBytes(file.size) : "—";
  elements.ipDimensions.textContent = img ? `${img.naturalWidth}×${img.naturalHeight}` : "—";

  elements.ipNearest.checked = state.settings.sampling === "nearest";
  if (elements.ipInterpolation) elements.ipInterpolation.value = state.settings.interpolation;

  elements.ipOutW.value = String(state.settings.output.width ?? "");
  elements.ipOutH.value = String(state.settings.output.height ?? "");
  elements.ipLockAspect.checked = Boolean(state.settings.output.lockAspect);
  if (elements.ipSizePreset) elements.ipSizePreset.value = "";

}

function openImageProperties() {
  if (!imagePropsModal) return;
  syncImagePropsUi();
  imagePropsModal.show();
}

function getLayerProjectSnapshot(layer) {
  const base = getLayerEffectStateSnapshot(layer);
  let imageDataUrl = base.imageDataUrl ?? null;

  if (!imageDataUrl && layer?.image) {
    try {
      const width = layer.image.naturalWidth ?? layer.image.width ?? layer.width ?? 1;
      const height = layer.image.naturalHeight ?? layer.image.height ?? layer.height ?? 1;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(layer.image, 0, 0, width, height);
      imageDataUrl = canvas.toDataURL();
    } catch {
      imageDataUrl = null;
    }
  }

  return {
    ...base,
    imageDataUrl,
    meta: {
      ...(base.meta ?? {}),
      dataUrl: imageDataUrl,
    },
  };
}

async function getProjectConfig() {
  return {
    version: 1,
    type: "magebox-project",
    project: {
      name: state.projectName ?? state.fileName ?? null,
      savedAt: new Date().toISOString(),
      canvas: {
        width: state.settings.output.width ?? null,
        height: state.settings.output.height ?? null,
      },
      settings: {
        sampling: state.settings.sampling,
        interpolation: state.settings.interpolation,
        output: state.settings.output,
        importAction: state.settings.importAction,
      },
      view: {
        zoomFactor: state.view.zoomFactor,
        panX: state.view.panX,
        panY: state.view.panY,
        showInfoBar: state.view.showInfoBar,
        showUndoPanel: state.view.showUndoPanel,
        showCheckerboard: state.view.showCheckerboard,
        activeTool: state.view.activeTool,
        soloEffectId: state.view.soloEffectId,
      },
      selectedLayerId: state.selectedLayerId,
      selectedLayerIds: state.selectedLayerIds,
      selectedEffectId: state.selectedEffectId,
    },
    layers: state.layers.map((layer) => getLayerProjectSnapshot(layer)),
  };
}

function getProjectBaseName() {
  return (
    sanitizeProjectFileName(state.projectName ?? state.fileName ?? getSelectedLayer()?.name ?? "magebox-project")
      .replace(/\.[^/.]+$/, "")
      .trim() || "magebox-project"
  );
}

function loadProjectsStore() {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return { version: 1, projects: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.projects)) return { version: 1, projects: parsed.projects };
    if (Array.isArray(parsed)) return { version: 1, projects: parsed };
    return { version: 1, projects: [] };
  } catch {
    return { version: 1, projects: [] };
  }
}

function saveProjectsStore(store) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(store, null, 2));
}

function upsertSavedProject(project) {
  const store = loadProjectsStore();
  const id = project?.id ?? String(Date.now());
  const next = {
    id,
    name: project.name,
    savedAt: project.savedAt ?? new Date().toISOString(),
    payload: project.payload,
  };
  const idx = store.projects.findIndex((entry) => entry.id === id || entry.name === next.name);
  if (idx >= 0) store.projects[idx] = next;
  else store.projects.unshift(next);
  try {
    saveProjectsStore(store);
  } catch (error) {
    console.error("Failed to save project store:", error);
    alert("Failed to save project: browser storage quota may be full.");
    throw error;
  }
}

function deleteSavedProject(id) {
  const store = loadProjectsStore();
  store.projects = store.projects.filter((entry) => entry.id !== id);
  saveProjectsStore(store);
}

function renderSavedProjectsList() {
  if (!elements.projectList) return;
  const store = loadProjectsStore();
  const projects = [...(store.projects ?? [])].sort((a, b) => String(b.savedAt ?? "").localeCompare(String(a.savedAt ?? "")));
  elements.projectList.innerHTML = "";

  if (!projects.length) {
    const empty = document.createElement("div");
    empty.className = "text-body-secondary small p-2";
    empty.textContent = "No projects saved yet.";
    elements.projectList.appendChild(empty);
    return;
  }

  for (const project of projects) {
    const row = document.createElement("div");
    row.className = "list-group-item d-flex align-items-center justify-content-between gap-2";

    const meta = document.createElement("div");
    meta.className = "text-truncate";
    meta.innerHTML = `<div class="fw-semibold text-truncate">${project.name ?? "Project"}</div><div class="small text-body-secondary">${project.savedAt ? new Date(project.savedAt).toLocaleString() : ""}</div>`;

    const actions = document.createElement("div");
    actions.className = "btn-group btn-group-sm";

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "btn btn-outline-primary";
    loadBtn.innerHTML = '<i class="bi bi-folder2-open"></i>';
    loadBtn.title = "Load project";
    loadBtn.addEventListener("click", async () => {
      try {
        await applyProjectConfig(project.payload, { replaceProject: true });
        Undo.reset(`Load project: ${project.name ?? "Project"}`, { fresh: true });
        projectModal?.hide();
      } catch (error) {
        console.error("Failed to load saved project:", error);
        alert("Failed to load saved project.");
      }
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-outline-danger";
    delBtn.innerHTML = '<i class="bi bi-trash"></i>';
    delBtn.title = "Delete project";
    delBtn.addEventListener("click", () => {
      if (!confirm(`Delete saved project "${project.name ?? "Project"}"?`)) return;
      deleteSavedProject(project.id);
      renderSavedProjectsList();
    });

    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);
    row.appendChild(meta);
    row.appendChild(actions);
    elements.projectList.appendChild(row);
  }
}

function applyLegacyEffectsConfig(config) {
  if (!config || typeof config !== "object") return false;
  const layer = getSelectedLayer();
  if (config.effects && typeof config.effects === "object" && layer) {
    for (const effect of EffectRegistry) {
      const incoming = config.effects[effect.id];
      if (!incoming) {
        layer.effects[effect.id] = {
          enabled: false,
          params: JSON.parse(JSON.stringify(effect.defaultParams ?? {})),
        };
        continue;
      }
      layer.effects[effect.id].enabled = Boolean(incoming.enabled);
      layer.effects[effect.id].params = {
        ...JSON.parse(JSON.stringify(effect.defaultParams ?? {})),
        ...(incoming.params ?? {}),
      };
    }
  }
  if (config.settings) {
    if (config.settings.sampling) state.settings.sampling = config.settings.sampling;
    if (config.settings.interpolation) state.settings.interpolation = config.settings.interpolation;
    if (config.settings.output) {
      state.settings.output = { ...state.settings.output, ...config.settings.output };
    }
  }
  renderEffectsList();
  renderEffectPanel();
  syncImagePropsUi();
  requestRender();
  persistSettings();
  return true;
}

async function applyProjectConfig(config, { replaceProject = true } = {}) {
  if (!config || typeof config !== "object") return false;

  if (!Array.isArray(config.layers) && !config.project && config.effects) {
    return applyLegacyEffectsConfig(config);
  }

  const project = config.project ?? config;
  const incomingLayers = Array.isArray(config.layers)
    ? config.layers
    : Array.isArray(project.layers)
      ? project.layers
      : [];
  if (!replaceProject && !incomingLayers.length) return false;

  const hydratedLayers = await Promise.all(
    incomingLayers.map(async (snapshot) => hydrateLayerSnapshot(snapshot, null)),
  );

  state.layers = hydratedLayers;
  state.projectName = project.name ?? state.projectName ?? null;
  if (project.settings) {
    if (project.settings.sampling) state.settings.sampling = project.settings.sampling;
    if (project.settings.interpolation) state.settings.interpolation = project.settings.interpolation;
    if (project.settings.output) {
      state.settings.output = { ...state.settings.output, ...project.settings.output };
    }
    if (project.settings.importAction) state.settings.importAction = project.settings.importAction;
  }
  if (project.canvas) {
    if (project.canvas.width) state.settings.output.width = project.canvas.width;
    if (project.canvas.height) state.settings.output.height = project.canvas.height;
  }
  if (project.view) {
    state.view.zoomFactor = clampNumber(Number(project.view.zoomFactor ?? state.view.zoomFactor), 0.01, 30);
    state.view.panX = clampNumber(Number(project.view.panX ?? state.view.panX), -100000, 100000);
    state.view.panY = clampNumber(Number(project.view.panY ?? state.view.panY), -100000, 100000);
    state.view.showInfoBar = Boolean(project.view.showInfoBar ?? state.view.showInfoBar);
    state.view.showUndoPanel = Boolean(project.view.showUndoPanel ?? state.view.showUndoPanel);
    state.view.showCheckerboard = Boolean(project.view.showCheckerboard ?? state.view.showCheckerboard);
    state.view.activeTool = project.view.activeTool ?? state.view.activeTool ?? null;
    state.view.soloEffectId = project.view.soloEffectId ?? null;
  }
  if (project.selectedEffectId) state.selectedEffectId = project.selectedEffectId;

  const selectedIds = Array.isArray(project.selectedLayerIds)
    ? project.selectedLayerIds
    : project.selectedLayerId
      ? [project.selectedLayerId]
      : hydratedLayers.length
        ? [hydratedLayers[hydratedLayers.length - 1].id]
        : [];
  const primaryId = project.selectedLayerId ?? selectedIds[selectedIds.length - 1] ?? null;
  syncSelectedLayerState(selectedIds, primaryId);

  applyInfoBarVisibility();
  applyUndoPanelVisibility();
  applyCheckerboardVisibility();
  renderLayersList();
  renderEffectsList();
  renderEffectPanel();
  updatePreviewTitle();
  updateImageMeta();
  syncImagePropsUi();
  applyMaskDrawingCursor();
  if (state.view.activeTool === "transform") {
    elements.menuToolTransform?.classList.add("active");
  } else {
    elements.menuToolTransform?.classList.remove("active");
  }

  if (!hydratedLayers.length) {
    if (elements.canvasWrap) elements.canvasWrap.classList.add("d-none");
    if (elements.emptyState) elements.emptyState.classList.remove("d-none");
  } else {
    if (elements.emptyState) elements.emptyState.classList.add("d-none");
    if (elements.canvasWrap) elements.canvasWrap.classList.remove("d-none");
  }

  state.fileName = project.name ?? state.fileName ?? null;
  requestRender();
  applyZoomStyles();
  persistSettings();
  return true;
}

function openProjectModal(mode) {
  if (!projectModal) return;
  if (elements.projectModalTitle) {
    elements.projectModalTitle.textContent = mode === "save" ? "Save Project" : "Load Project";
  }
  if (elements.projectSaveArea) elements.projectSaveArea.style.display = mode === "save" ? "" : "none";
  if (elements.projectLoadArea) elements.projectLoadArea.style.display = mode === "load" ? "" : "none";
  if (elements.projectName) {
    elements.projectName.value = state.projectName ?? state.fileName ?? getSelectedLayer()?.name ?? "magebox project";
  }
  if (mode === "load") renderSavedProjectsList();
  projectModal.show();
}

async function saveProjectToLibrary(name = null) {
  const projectName = sanitizeProjectFileName(name ?? state.projectName ?? state.fileName ?? getProjectBaseName());
  state.projectName = projectName;
  if (elements.projectName) elements.projectName.value = projectName;
  const project = await getProjectConfig();
  if (!project.project) project.project = {};
  project.project.name = projectName;
  upsertSavedProject({
    id: String(Date.now()),
    name: projectName,
    savedAt: new Date().toISOString(),
    payload: project,
  });
  persistSettings();
  if (elements.projectModalTitle) elements.projectModalTitle.textContent = "Project Saved";
  renderSavedProjectsList();
}

async function downloadProjectJson(name = null) {
  const projectName = sanitizeProjectFileName(name ?? state.projectName ?? state.fileName ?? getProjectBaseName());
  const project = await getProjectConfig();
  if (!project.project) project.project = {};
  project.project.name = projectName;
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function loadProjectFromFile(file) {
  if (!file) return false;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const ok = await applyProjectConfig(parsed, { replaceProject: true });
    if (ok) {
      const projectName = parsed?.project?.name ?? parsed?.name ?? file.name ?? "Project";
      Undo.reset(`Load project: ${projectName}`, { fresh: true });
    }
    return ok;
  } catch (error) {
    console.error("Failed to load project:", error);
    alert("Failed to load project: invalid or unsupported JSON file.");
    return false;
  }
}

function resetEffects() {
  const layer = getSelectedLayer();
  if (!layer) return;
  for (const effect of EffectRegistry) {
    layer.effects[effect.id].enabled = false;
    layer.effects[effect.id].params = JSON.parse(JSON.stringify(effect.defaultParams ?? {}));
  }
  renderEffectPanel();
  requestRender();
  persistSettings();
  Undo.push(`Reset effects on ${layer.name}`);
}

elements.menuUpload?.addEventListener("click", () => elements.fileInput.click());
elements.menuImageProperties?.addEventListener("click", openImageProperties);
elements.menuResetEffects?.addEventListener("click", resetEffects);
elements.menuToggleTheme?.addEventListener("click", () => {
  const root = document.documentElement;
  root.dataset.bsTheme = root.dataset.bsTheme === "light" ? "dark" : "light";
  persistSettings();
});

elements.previewArea?.addEventListener("click", () => {
  if (!state.layers.length) elements.fileInput.click();
});

function applyZoomStyles() {
  if (!elements.canvas) return;
  const zoom = state.view.zoomFactor;
  if (!state.layers.length || elements.canvas.width === 0 || elements.canvas.height === 0) {
    elements.zoomLevel &&
      (elements.zoomLevel.textContent = `${Math.round(state.view.zoomFactor * 100)}%`);
    if (elements.zoomSlider) elements.zoomSlider.value = String(zoomToSliderValue(state.view.zoomFactor));
    return;
  }

  elements.canvas.style.transformOrigin = "center center";
  elements.canvas.style.transform = `translate(${Math.round(state.view.panX)}px, ${Math.round(
    state.view.panY,
  )}px) scale(${zoom})`;
  if (elements.zoomLevel) elements.zoomLevel.textContent = `${Math.round(state.view.zoomFactor * 100)}%`;
  if (elements.zoomSlider) elements.zoomSlider.value = String(zoomToSliderValue(state.view.zoomFactor));
  renderTransformOverlay();
  persistSettings();
}

function setZoom(next) {
  state.view.zoomFactor = clampNumber(Number(next), 0.01, 30);
  applyZoomStyles();
}

function computeFitZoom() {
  if (!state.layers.length || !elements.previewArea || !elements.canvas) return 1;
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
    elements.zoomSlider.addEventListener("input", () => setZoom(sliderValueToZoom(elements.zoomSlider.value)));
  }
  elements.zoomOut?.addEventListener("click", () => {
    const delta = state.view.zoomFactor <= 1 ? 0.05 : 0.1;
    setZoom(state.view.zoomFactor - delta);
  });
  elements.zoomIn?.addEventListener("click", () => {
    const delta = state.view.zoomFactor < 1 ? 0.05 : 0.1;
    setZoom(state.view.zoomFactor + delta);
  });
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
    if (!state.layers.length) {
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
    const layer = getSelectedLayer();
    if (!layer) return;
    const effectState = layer.effects[effectId];
    effectState.params[key] = sampled.color;
    effectState.enabled = true;
    if (state.selectedEffectId === effectId) elements.effectEnabled.checked = true;
    renderEffectsList();
    renderEffectPanel();
    requestRender();
    persistSettings();
    Undo.push(`Adjust ${effect.name} on ${layer.name}`);
    // auto-exit picker mode after selection
    state.view.colorPicker = null;
    hideIndicator();
    renderEffectPanel();
  });
}

const maskOffscreenCanvases = new Map();

function initMaskDrawing() {
  const canvas = elements.canvas;
  const area = elements.previewArea;
  const indicator = elements.brushIndicator;
  if (!canvas || !area || !indicator) return;

  let isDrawing = false;
  let lastX = null;
  let lastY = null;

  const setIndicator = (clientX, clientY) => {
    const ds = state.view.maskDrawing;
    if (!ds.active) {
      indicator.classList.add("d-none");
      return;
    }

    const areaRect = area.getBoundingClientRect();
    const x = clientX - areaRect.left;
    const y = clientY - areaRect.top;

    // Calculate visual size based on zoom
    const zoom = state.view.zoomFactor;
    const visualSize = ds.size * (canvas.getBoundingClientRect().width / canvas.width);

    indicator.style.left = `${x}px`;
    indicator.style.top = `${y}px`;
    indicator.style.width = `${visualSize}px`;
    indicator.style.height = `${visualSize}px`;
    indicator.style.borderColor = ds.mode === 'add' ? '#198754' : '#dc3545'; // Green or Red
    indicator.classList.remove("d-none");
  };

  const getMaskCanvas = (effectId, paramKey) => {
    const key = `${effectId}-${paramKey}`;
    if (maskOffscreenCanvases.has(key)) return maskOffscreenCanvases.get(key);
    
    const cvs = document.createElement('canvas');
    const firstLayer = getSelectedLayer() ?? state.layers[0];
    cvs.width = firstLayer ? firstLayer.image.naturalWidth : 1024;
    cvs.height = firstLayer ? firstLayer.image.naturalHeight : 1024;
    
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    
    const selectedLayer = getSelectedLayer();
    const existing = selectedLayer?.effects?.[effectId]?.params[paramKey];
    if (existing) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
      img.src = existing;
    } else {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
    }

    maskOffscreenCanvases.set(key, cvs);
    return cvs;
  };

  const draw = (clientX, clientY) => {
    const ds = state.view.maskDrawing;
    if (!ds.active || !ds.effectId) return;

    const rect = canvas.getBoundingClientRect();
    const rx = (clientX - rect.left) / rect.width;
    const ry = (clientY - rect.top) / rect.height;
    if (rx < 0 || rx > 1 || ry < 0 || ry > 1) return;

    const mCvs = getMaskCanvas(ds.effectId, ds.paramKey);
    const mCtx = mCvs.getContext('2d');
    
    // Exact mapping from screen pixels to mask-canvas pixels
    const x = rx * mCvs.width;
    const y = ry * mCvs.height;

    // Convert screen brush size to mask-canvas size
    const scale = mCvs.width / rect.width;
    const brushRadius = (ds.size / 2) * scale;

    mCtx.globalCompositeOperation = 'source-over';
    const drawColor = ds.mode === 'add' ? 'white' : 'black';
    mCtx.fillStyle = drawColor;
    mCtx.strokeStyle = drawColor;
    mCtx.lineWidth = brushRadius * 2;
    mCtx.lineCap = 'round';
    mCtx.lineJoin = 'round';

    if (lastX !== null && lastY !== null) {
      mCtx.beginPath();
      mCtx.moveTo(lastX, lastY);
      mCtx.lineTo(x, y);
      mCtx.stroke();
    } else {
      mCtx.beginPath();
      mCtx.arc(x, y, brushRadius, 0, Math.PI * 2);
      mCtx.fill();
    }

    lastX = x;
    lastY = y;

    const layer = getSelectedLayer();
    if (layer) layer.effects[ds.effectId].params[ds.paramKey] = mCvs; // Pass direct canvas for flicker-free active drawing
    requestRender();
  };

  area.addEventListener('mousedown', (e) => {
    if (state.view.maskDrawing.active && e.button === 0) {
      isDrawing = true;
      lastX = null;
      lastY = null;
      draw(e.clientX, e.clientY);
    }
  });

  area.addEventListener('mousemove', (e) => {
    setIndicator(e.clientX, e.clientY);
    if (isDrawing) draw(e.clientX, e.clientY);
  });

  area.addEventListener('mouseleave', () => {
    indicator.classList.add("d-none");
  });

  window.addEventListener('mousemove', (e) => {
    if (isDrawing) draw(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', () => {
    if (isDrawing) {
      isDrawing = false;
      lastX = null;
      lastY = null;
      const layer = getSelectedLayer();
      const ds = state.view.maskDrawing;
      const mCvs = maskOffscreenCanvases.get(`${ds.effectId}-${ds.paramKey}`);
      if (mCvs) {
        if (layer) layer.effects[ds.effectId].params[ds.paramKey] = mCvs.toDataURL(); // Save as string for persistence
      }
      persistSettings();
      Undo.push(`Draw Mask${layer ? ` on ${layer.name}` : ""}`);
    }
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

function applyCheckerboardVisibility() {
  if (!elements.previewArea) return;
  elements.previewArea.classList.toggle("show-checkerboard", state.view.showCheckerboard);
}

function applyMaskDrawingCursor() {
  if (!elements.previewArea) return;
  elements.previewArea.classList.toggle("is-drawing-mask", state.view.maskDrawing.active);
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
  let isDraggingParam = false;

  function begin(e, nextMode) {
    if (!state.layers.length) return;
    active = true;
    mode = nextMode;
    startX = e.clientX;
    startY = e.clientY;
    startPanX = state.view.panX;
    startPanY = state.view.panY;
    canvas.classList.add("is-panning");
  }

  function updateParamFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const rx = clampNumber((e.clientX - rect.left) / rect.width, 0, 1);
    const ry = clampNumber((e.clientY - rect.top) / rect.height, 0, 1);
    
    const effect = EffectRegistry.find(ef => ef.id === state.selectedEffectId);
    const layer = getSelectedLayer();
    const effectState = layer?.effects?.[state.selectedEffectId];
    if (!effect || !effectState) return;
    
    const paramX = effect.params?.find(p => p.interactive && p.key.toLowerCase().includes('x'));
    const paramY = effect.params?.find(p => p.interactive && p.key.toLowerCase().includes('y'));
    
    if (paramX) effectState.params[paramX.key] = rx;
    // Flip Y because DOM is top-0, but our WebGL UV space is bottom-0
    if (paramY) effectState.params[paramY.key] = 1.0 - ry;
    
    renderEffectPanel();
    requestRender();
  }

  function maybeBegin(e) {
    if (state.view.maskDrawing.active) return;
    if (state.view.colorPicker) return;

    if (e.button === 1) {
      e.preventDefault();
      begin(e, "middle");
      return;
    }

    if (isTransformToolActive()) return;

    // Interactive Parameter Dragging
    const effect = EffectRegistry.find(ef => ef.id === state.selectedEffectId);
    const layer = getSelectedLayer();
    const effectState = layer?.effects?.[state.selectedEffectId];
    if (!effect || !effectState) return;
    if (effect && effectState?.enabled && !spaceDown && e.button === 0) {
      const interactiveX = effect.params?.find(p => p.interactive && p.key.toLowerCase().includes('x'));
      const interactiveY = effect.params?.find(p => p.interactive && p.key.toLowerCase().includes('y'));
      
      if (interactiveX && interactiveY) {
        isDraggingParam = true;
        area.style.cursor = "crosshair";
        updateParamFromEvent(e);
        return;
      }
    }

    if (e.button === 0 && spaceDown) {
      e.preventDefault();
      begin(e, "space");
    }
  }

  area.addEventListener("mousedown", maybeBegin);

  window.addEventListener("mousemove", (e) => {
    if (isDraggingParam) {
      updateParamFromEvent(e);
      return;
    }

    if (active) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      state.view.panX = startPanX + dx * PAN_SENSITIVITY;
      state.view.panY = startPanY + dy * PAN_SENSITIVITY;
      applyZoomStyles();
      return;
    }
    if (spaceDown && state.layers.length) {
      // "Instant" pan while holding Space (no click required)
      if (lastMoveX !== 0 || lastMoveY !== 0) {
        const dx = e.clientX - lastMoveX;
        const dy = e.clientY - lastMoveY;
        state.view.panX += dx * PAN_SENSITIVITY;
        state.view.panY += dy * PAN_SENSITIVITY;
        applyZoomStyles();
      }
      lastMoveX = e.clientX;
      lastMoveY = e.clientY;
    }
  });
window.addEventListener("mouseup", (e) => {
  if (isDraggingParam) {
    isDraggingParam = false;
    area.style.cursor = "";
    Undo.push(`Move ${state.selectedEffectId} center`);
    return;
  }
  if (!active) return;
  if (mode === "middle" && e.button !== 1) return;
  if (mode === "space" && e.button !== 0) return;
  active = false;
  mode = null;
  canvas.classList.remove("is-panning");
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
    addLayerFromFileList(e.dataTransfer?.files);
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
      if (!state.layers.length) return;
      e.preventDefault();

      // Touchpad support:
      // - Two-finger pan => wheel with ctrlKey=false.
      // - Pinch zoom (most browsers) => wheel with ctrlKey=true.
      if (e.ctrlKey || e.metaKey) {
        const rect = canvas.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const mx = e.clientX;
        const my = e.clientY;
        const dx = mx - cx;
        const dy = my - cy;

        const current = state.view.zoomFactor;
        // Lower sensitivity for pinch zoom (trackpads can emit large deltaY values).
        const factor = Math.exp(-e.deltaY * ZOOM_SENSITIVITY);
        const next = clampNumber(current * factor, 0.01, 30);

        const scale = next / current;
        state.view.panX = state.view.panX + dx * (1 - scale);
        state.view.panY = state.view.panY + dy * (1 - scale);
        state.view.zoomFactor = next;
        applyZoomStyles();
      } else {
        // Invert wheel deltas to match "grab and move" panning behavior.
        state.view.panX -= e.deltaX * PAN_SENSITIVITY;
        state.view.panY -= e.deltaY * PAN_SENSITIVITY;
        applyZoomStyles();
      }
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
  if (!state.layers.length) return;
  const lockAspect = Boolean(elements.ipLockAspect?.checked);
  state.settings.output.lockAspect = lockAspect;

  const baseLayer = getSelectedLayer() ?? state.layers[0];
  const naturalW = baseLayer.image.naturalWidth;
  const naturalH = baseLayer.image.naturalHeight;
  const aspect = naturalW / naturalH;
  const oldW = state.settings.output.width ?? naturalW;
  const oldH = state.settings.output.height ?? naturalH;

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
  scaleLayersToCanvas(oldW, oldH, w, h);
  elements.ipOutW.value = String(w);
  elements.ipOutH.value = String(h);
  updateImageMeta();
  requestRender();
  persistSettings();
}

elements.ipOutW?.addEventListener("input", () => applyResizeFromUi({ changed: "w" }));
elements.ipOutH?.addEventListener("input", () => applyResizeFromUi({ changed: "h" }));
elements.ipLockAspect?.addEventListener("change", () => applyResizeFromUi());
elements.ipOutW?.addEventListener("change", () => Undo.push("Resize"));
elements.ipOutH?.addEventListener("change", () => Undo.push("Resize"));
elements.ipLockAspect?.addEventListener("change", () => Undo.push("Resize"));

elements.ipSizePreset?.addEventListener("change", () => {
  if (!state.layers.length) return;
  const v = String(elements.ipSizePreset.value || "");
  const baseLayer = getSelectedLayer() ?? state.layers[0];
  const naturalW = baseLayer.image.naturalWidth;
  const naturalH = baseLayer.image.naturalHeight;
  const oldW = state.settings.output.width ?? naturalW;
  const oldH = state.settings.output.height ?? naturalH;

  let nextW = state.settings.output.width ?? naturalW;
  let nextH = state.settings.output.height ?? naturalH;

  if (v === "orig") {
    nextW = naturalW;
    nextH = naturalH;
  } else if (v.startsWith("scale:")) {
    const factor = clampNumber(Number(v.slice("scale:".length)), 0.01, 100);
    nextW = Math.max(1, Math.round(naturalW * factor));
    nextH = Math.max(1, Math.round(naturalH * factor));
  } else if (/^\d+x\d+$/.test(v)) {
    const [w, h] = v.split("x").map((n) => Number(n));
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      nextW = Math.round(w);
      nextH = Math.round(h);
    }
  } else {
    return;
  }

  state.settings.output.width = nextW;
  state.settings.output.height = nextH;
  scaleLayersToCanvas(oldW, oldH, nextW, nextH);
  if (elements.ipOutW) elements.ipOutW.value = String(nextW);
  if (elements.ipOutH) elements.ipOutH.value = String(nextH);
  updateImageMeta();
  requestRender();
  persistSettings();
  Undo.push("Resize");
});

initResizablePanels();
initMenubarHover();
initDragDropPreview();
initErrorModal();
initExperimentalTransformModal();
initAboutModal();
initExportModal();
initProjectModal();
initImportConfirmModal();
initTransformTool();
restoreSettings();
applyInfoBarVisibility();
applyUndoPanelVisibility();
applyCheckerboardVisibility();
initZoomBar();
initWheelZoom();
initPixelHover();
initColorPicker();
initMaskDrawing();
initPanning();
initUndoPanelResize();
setLeftPanelView("effects");
renderLayersList();
renderEffectsList();
renderEffectPanel();
Undo.reset("Ready", { fresh: true });
Undo.render();

elements.undoBtn?.addEventListener("click", () => Undo.undo());
elements.redoBtn?.addEventListener("click", () => Undo.redo());
elements.menuUndo?.addEventListener("click", () => Undo.undo());
elements.menuRedo?.addEventListener("click", () => Undo.redo());
elements.leftTabEffects?.addEventListener("click", () => setLeftPanelView("effects"));
elements.leftTabLayers?.addEventListener("click", () => setLeftPanelView("layers"));
elements.importLayersBtn?.addEventListener("click", () => elements.fileInput?.click());
elements.newLayerBtn?.addEventListener("click", () => createEmptyLayer());
elements.menuToolTransform?.addEventListener("click", () => {
  if (isTransformToolActive()) {
    deactivateTransformTool();
  } else {
    if (state.settings.skipExperimentalTransformWarning) {
      activateTransformTool();
    } else {
      if (elements.experimentalTransformDontShow) {
        elements.experimentalTransformDontShow.checked = false;
      }
      experimentalTransformModal?.show();
    }
  }
});
elements.menuLayerNew?.addEventListener("click", createEmptyLayer);
elements.menuLayerImport?.addEventListener("click", () => elements.fileInput?.click());
elements.menuLayerDuplicate?.addEventListener("click", duplicateSelectedLayers);
elements.menuLayerRename?.addEventListener("click", renameSelectedLayer);
elements.menuLayerSelectAll?.addEventListener("click", selectAllLayers);
elements.menuLayerMoveUp?.addEventListener("click", () => moveSelectedLayers("up"));
elements.menuLayerMoveDown?.addEventListener("click", () => moveSelectedLayers("down"));
elements.menuLayerDelete?.addEventListener("click", () => deleteLayersByIds(getLayerSelectionIds()));

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

elements.menuToggleCheckerboard?.addEventListener("click", () => {
  state.view.showCheckerboard = !state.view.showCheckerboard;
  applyCheckerboardVisibility();
  persistSettings();
});

elements.menuSoloEffect?.addEventListener("click", () => {
  if (!state.selectedEffectId) return;
  const isSolo = state.view.soloEffectId === state.selectedEffectId;
  state.view.soloEffectId = isSolo ? null : state.selectedEffectId;
  renderEffectPanel();
  requestRender();
  persistSettings();
});

function isEditableTarget(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable
  );
}

function commitTransform() {
  const layer = getSelectedLayer();
  const transformState = layer?.effects?.transform;
  if (!layer || !transformState?.enabled) return;
  // Instead of disabling, we just toggle the tool activity
  deactivateTransformTool();
  renderEffectsList();
  if (state.selectedEffectId === "transform") renderEffectPanel();
  // No need to push Undo for just toggling tool visibility
}

window.addEventListener("keydown", (e) => {
  if (isEditableTarget(e.target) && !(e.ctrlKey || e.metaKey)) return;
  if (e.key === "Enter" && !e.repeat && !(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)) {
    if (document.querySelector(".modal.show")) return;
    e.preventDefault();
    commitTransform();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "t") {
    e.preventDefault();
    elements.menuToolTransform?.click();
    return;
  }
  if (e.ctrlKey || e.metaKey) {
    if (e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      Undo.undo();
    } else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
      e.preventDefault();
      Undo.redo();
    }
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    const selectedIds = getLayerSelectionIds();
    if (!selectedIds.length) return;
    e.preventDefault();
    deleteLayersByIds(selectedIds);
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
      }, { skipConfirm: true });
    }
  }
} catch {
  // ignore
}
