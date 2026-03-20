/**
 * Magebox Shared UI Components
 */

const MageboxUI = (() => {
  return {
    /**
     * Creates a standardized drag-and-drop uploader.
     * @param {string} container_selector - Where to inject the uploader.
     * @param {string} title - The title shown in the uploader.
     * @param {Function} on_file_loaded - Callback function (dataUrl, file).
     */
    create_uploader: (container_selector, title, on_file_loaded) => {
      const container = document.querySelector(container_selector);
      if (!container) return;

      const uploader = document.createElement('div');
      uploader.className = 'mb-uploader animate-bounce-in';
      uploader.innerHTML = `
        <i class="bi bi-cloud-arrow-up display-3 text-primary mb-3 d-block"></i>
        <h4 class="fw-bold">${title}</h4>
        <p class="text-secondary">Drag and drop an image or click to browse</p>
        <input type="file" class="d-none mb-file-input" accept="image/*">
        <button class="btn btn-primary px-4">Select Image</button>
      `;

      const file_input = uploader.querySelector('.mb-file-input');
      const btn = uploader.querySelector('.btn');

      const handle_file = (file) => {
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => on_file_loaded(e.target.result, file);
          reader.readAsDataURL(file);
        }
      };

      uploader.addEventListener('click', () => file_input.click());
      uploader.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploader.classList.add('dragover');
      });
      uploader.addEventListener('dragleave', () => {
        uploader.classList.remove('dragover');
      });
      uploader.addEventListener('drop', (e) => {
        e.preventDefault();
        uploader.classList.remove('dragover');
        handle_file(e.dataTransfer.files[0]);
      });

      file_input.addEventListener('change', (e) => {
        handle_file(e.target.files[0]);
      });

      container.appendChild(uploader);
      return {
        show: () => uploader.classList.remove('d-none'),
        hide: () => uploader.classList.add('d-none'),
        reset: () => { file_input.value = ''; uploader.classList.remove('d-none'); }
      };
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MageboxUI;
}
