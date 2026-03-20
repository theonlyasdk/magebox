import adjustments from "./adjustments.js";
import bilateral from "./bilateral-blur.js";
import bloom from "./bloom.js";
import blur from "./blur.js";
import cartoon from "./cartoon.js";
import colorIsolation from "./color-isolation.js";
import fisheye from "./fisheye.js";
import gradientMap from "./gradient-map.js";
import grayscale from "./grayscale.js";
import greenScreen from "./green-screen.js";
import noise from "./noise.js";
import outline from "./outline.js";
import pixelate from "./pixelate.js";
import posterize from "./posterize.js";
import repeat from "./repeat.js";
import scanlines from "./scanlines.js";
import threshold from "./threshold.js";
import vignette from "./vignette.js";
import warp from "./warp.js";

export const EffectRegistry = [
  adjustments,
  bilateral,
  bloom,
  blur,
  cartoon,
  colorIsolation,
  fisheye,
  gradientMap,
  grayscale,
  greenScreen,
  noise,
  outline,
  pixelate,
  posterize,
  repeat,
  scanlines,
  threshold,
  vignette,
  warp,
];
