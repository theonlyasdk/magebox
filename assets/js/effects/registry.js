import adjustments from "./adjustments.js";
import bilateral from "./bilateral-blur.js";
import bloom from "./bloom.js";
import blur from "./blur.js";
import cartoon from "./cartoon.js";
import colorIsolation from "./color-isolation.js";
import curves from "./curves.js";
import fisheye from "./fisheye.js";
import gradientMap from "./gradient-map.js";
import grayscale from "./grayscale.js";
import greenScreen from "./green-screen.js";
import halftone from "./halftone.js";
import noise from "./noise.js";
import outline from "./outline.js";
import pixelate from "./pixelate.js";
import posterize from "./posterize.js";
import repeat from "./repeat.js";
import scanlines from "./scanlines.js";
import sharpen from "./sharpen.js";
import stretch from "./stretch.js";
import subjectSeparation from "./subject-separation.js";
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
  curves,
  fisheye,
  gradientMap,
  grayscale,
  greenScreen,
  halftone,
  noise,
  outline,
  pixelate,
  posterize,
  repeat,
  scanlines,
  sharpen,
  stretch,
  subjectSeparation,
  threshold,
  vignette,
  warp,
];
