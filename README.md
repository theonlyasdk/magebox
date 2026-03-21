# Magebox
An easy to use image manipulation software, right on your browser.
I hope game designers and digital artists find this app handy :)

## How to use?
Go to https://theonlyasdk.github.io/magebox to use the app for free!

## Adding a New Effect

1. Create a new effect module in `assets/js/effects/` (one file per effect).
2. Export a default object with:
   - `id`, `name`, `icon`, `description`
   - `defaultParams`
   - `params` (range/select/color definitions)
   - `gl` with `passes(params, context)` returning shader passes
3. Import and register it in `assets/js/effects/registry.js`.

### WebGL Implementation

Effects run through the shared WebGL pipeline in `assets/js/gl/webgl-renderer.js`.

Use `assets/js/gl/effect-api.js`:

```js
import { defineGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

const FRAGMENT = fragmentShaderSource(
  "uniform float u_amount;",
  `
  vec4 color = sampleLinear(v_uv);
  gl_FragColor = vec4(color.rgb * u_amount, color.a);
`,
);

export default defineGpuEffect({
  id: "example",
  name: "Example",
  icon: "bi-stars",
  description: "Example GPU effect.",
  params: [{ key: "amount", label: "Amount", type: "range", min: 0, max: 2, step: 0.1 }],
  defaultParams: { amount: 1 },
  gl: {
    isNeutral(params) {
      return Number(params.amount ?? 1) === 1;
    },
    passes(params) {
      return [pass(FRAGMENT, { u_amount: Number(params.amount ?? 1) })];
    },
  },
});
```

The renderer injects:
- `u_texture`
- `u_inputSize`
- `u_outputSize`
- `u_texelSize`
- `v_uv`

Common GLSL helpers live in `assets/js/gl/shader-chunks.js`.

## License
Licensed under the [Mozilla Public License Version 2.0](LICENSE)
