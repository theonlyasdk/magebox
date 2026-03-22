# Adding an Effect

To add a new effect to Magebox, follow these steps:

1.  **Create a module**: Place a new JavaScript file in `assets/js/effects/` directory.
2.  **Define the effect**: Export a default object created with `createGpuEffect` function.
3.  **Register the effect**: Import and add your new module to `assets/js/effects/registry.js`

## The `createGpuEffect` Configuration

The `createGpuEffect` function takes a configuration object that describes how the effect looks, how it is controlled, and how it renders. Below is an explanation of each property in this object:

*   **`id`**: A unique string that identifies the effect. This is used internally to track the effect across the application.
*   **`name`**: The display name of the effect as it appears in the user interface.
*   **`icon`**: A Bootstrap Icon class name (e.g., `bi-stars`) used to represent the effect visually in the effects list.
*   **`description`**: A short text explaining what the effect does to the image.
*   **`params`**: An array of objects defining the controls available to the user. Each parameter object includes a `key`, `label`, `type` (such as `range`, `select`, `color`, or `checkbox`), and specific constraints like `min`, `max`, or `step`.
*   **`defaultParams`**: An object containing the initial values for the parameters defined in the `params` array.
*   **`render`**: An object that contains the logic for WebGL-based rendering. This is the core of the effect's visual transformation.
*   **`getFilter(params)`** *(Optional)*: A function that returns a CSS filter string equivalent to the effect. This can be used for faster previews or simpler rendering paths when full WebGL processing is not required.

### The `render` Object

The `render` property is where the actual rendering logic is defined. It typically contains the following functions:

*   **`isNeutral(params)`**: This function checks the current parameter values and returns `true` if the effect should be considered "inactive" or "neutral." An effect is neutral when it does not change the appearance of the image (for example, a brightness effect at 0% change). When this returns `true`, the renderer can skip processing this effect to save performance.
*   **`passes(params, context)`**: This function is responsible for creating the rendering pipeline. It returns an array of "passes," where each pass is created using the `pass()` helper function. Each pass specifies a fragment shader and the values (uniforms) to be sent to that shader.

## Understanding `isNeutral`

The `isNeutral` function is a performance optimization. It allows the system to determine if an effect is currently having no impact on the image. For instance, if a "Grayscale" effect has its "Amount" set to 0, `isNeutral` should return `true`. This informs the application that it can safely bypass the shader execution for this effect, reducing the workload on the graphics processor.

## Example Effect Structure

```javascript
import { createGpuEffect, pass } from "../gl/effect-api.js";
import { fragmentShaderSource } from "../gl/shader-chunks.js";

// Define the fragment shader using a helper that provides common utilities
const FRAGMENT = fragmentShaderSource(
  "uniform float u_amount;",
  `
  vec4 color = sampleLinear(v_uv);
  gl_FragColor = vec4(color.rgb * u_amount, color.a);
`,
);

export default createGpuEffect({
  id: "example",
  name: "Example",
  icon: "bi-stars",
  description: "An example effect that multiplies color brightness.",
  params: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 2, step: 0.1 }
  ],
  defaultParams: { amount: 1 },
  render: {
    // Returns true if the amount is 1 (no change to brightness)
    isNeutral(params) {
      return Number(params.amount ?? 1) === 1;
    },
    // Returns the rendering pass with the current amount
    passes(params) {
      return [pass(FRAGMENT, { u_amount: Number(params.amount ?? 1) })];
    },
  },
});
```

## Available Shader Variables

When writing fragment shaders, the following variables are automatically provided by the renderer:

*   **`u_texture`**: The input image or the result of the previous effect.
*   **`u_inputSize`**: The dimensions (width and height) of the input texture.
*   **`u_outputSize`**: The dimensions of the target rendering area.
*   **`u_texelSize`**: The size of a single pixel relative to the texture size (1.0 / width, 1.0 / height).
*   **`v_uv`**: The texture coordinates for the current pixel.

Effects are processed through a shared WebGL pipeline located in `assets/js/gl/webgl-renderer.js`. You can find common GLSL utilities in `assets/js/gl/shader-chunks.js`.

It is recommended to review existing effects in the `assets/js/effects/` folder to better understand practical implementations of the API.