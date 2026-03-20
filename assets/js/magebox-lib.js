/**
 * Magebox Shared Image Modification Helper Library
 * Provides a declarative/functional API for image processing.
 */

const Magebox = (() => {
  class ImagePipeline {
    constructor(source) {
      this.source = source;
      this.effects = [];
    }

    apply(effect_fn) {
      this.effects.push(effect_fn);
      return this;
    }

    async render(target_selector) {
      const img = await this._load_image(this.source);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      let image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);

      for (const effect of this.effects) {
        image_data = effect(image_data, canvas.width, canvas.height);
      }

      ctx.putImageData(image_data, 0, 0);

      const target = document.querySelector(target_selector);
      if (target) {
        if (target.tagName === 'IMG') {
          target.src = canvas.toDataURL();
        } else {
          target.innerHTML = '';
          target.appendChild(canvas);
        }
      }
      return canvas.toDataURL();
    }

    _load_image(src) {
      return new Promise((resolve, reject) => {
        if (src instanceof HTMLImageElement) {
          if (src.complete) resolve(src);
          else src.onload = () => resolve(src);
          return;
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }
  }

  return {
    pipeline: (source) => new ImagePipeline(source),
    
    // Effects
    effects: {
      grayscale: () => (image_data) => {
        const data = image_data.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg;
          data[i + 1] = avg;
          data[i + 2] = avg;
        }
        return image_data;
      },

      brightness: (value) => (image_data) => {
        const data = image_data.data;
        const adjustment = value * 255;
        for (let i = 0; i < data.length; i += 4) {
          data[i] += adjustment;
          data[i + 1] += adjustment;
          data[i + 2] += adjustment;
        }
        return image_data;
      },

      blur: (radius) => (image_data, width, height) => {
        // Simple box blur for demonstration
        const data = image_data.data;
        const copy = new Uint8ClampedArray(data);
        const r = Math.floor(radius);
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let rs = 0, gs = 0, bs = 0, count = 0;
            for (let dy = -r; dy <= r; dy++) {
              for (let dx = -r; dx <= r; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const idx = (ny * width + nx) * 4;
                  rs += copy[idx];
                  gs += copy[idx + 1];
                  bs += copy[idx + 2];
                  count++;
                }
              }
            }
            const i = (y * width + x) * 4;
            data[i] = rs / count;
            data[i + 1] = gs / count;
            data[i + 2] = bs / count;
          }
        }
        return image_data;
      }
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Magebox;
}
