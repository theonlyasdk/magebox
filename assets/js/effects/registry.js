import blur from "./blur.js";
import brightness from "./brightness.js";
import grayscale from "./grayscale.js";
import outline from "./outline.js";
import cartoon from "./cartoon.js";
import repeat from "./repeat.js";
import warp from "./warp.js";
import fisheye from "./fisheye.js";
import colorIsolation from "./color-isolation.js";
import greenScreen from "./green-screen.js";

export const EffectRegistry = [
  grayscale,
  blur,
  brightness,
  greenScreen,
  colorIsolation,
  outline,
  cartoon,
  repeat,
  warp,
  fisheye,
];
