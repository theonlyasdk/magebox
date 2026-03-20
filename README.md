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
   - `controls` (slider definitions)
   - `getFilter(params)` (returns a Canvas `ctx.filter` segment or `null`)
3. Import and register it in `assets/js/effects/registry.js`.

## License
Licensed under the [Mozilla Public License Version 2](LICENSE)
