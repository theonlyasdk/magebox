/**
 * Magebox Shared UI Components
 */

import { generateSplineLUT } from "./utils/math.js";

export const MageboxUI = (() => {
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
    },

    /**
     * CurvesEditor Component
     */
    CurvesEditor: class {
      constructor({ container, points, onChange, color = '#0d6efd' }) {
        this.container = container;
        this.points = points.map(p => [...p]).sort((a, b) => a[0] - b[0]);
        this.onChange = onChange;
        this.color = color;
        this.draggingIndex = -1;
        this.hoverIndex = -1;
        this.histogram = null;
        
        this.canvas = document.createElement('canvas');
        this.canvas.width = 200;
        this.canvas.height = 200;
        this.canvas.className = 'rounded bg-dark-subtle border border-secondary shadow-sm mb-curves-editor';
        this.canvas.style.cursor = 'crosshair';
        this.ctx = this.canvas.getContext('2d');
        
        this.container.appendChild(this.canvas);
        this.#initEvents();
        this.draw();
      }

      #initEvents() {
        const getCoord = (e) => {
          const rect = this.canvas.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = 1.0 - (e.clientY - rect.top) / rect.height;
          return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
        };

        const findPoint = (nx, ny) => {
          const threshold = 0.06;
          let foundIdx = -1;
          let minDist = threshold;
          for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            const d = Math.sqrt((p[0] - nx) ** 2 + (p[1] - ny) ** 2);
            if (d < minDist) {
              minDist = d;
              foundIdx = i;
            }
          }
          return foundIdx;
        };

        this.canvas.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const [nx, ny] = getCoord(e);
          const idx = findPoint(nx, ny);
          if (idx !== -1 && idx !== 0 && idx !== this.points.length - 1) {
            this.points.splice(idx, 1);
            this.hoverIndex = -1;
            this.onChange(this.points);
            this.draw();
          }
        });

        this.canvas.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return; // Only left click
          const [nx, ny] = getCoord(e);
          const foundIdx = findPoint(nx, ny);

          if (foundIdx !== -1) {
            this.draggingIndex = foundIdx;
          } else {
            // Add point
            const newPoint = [nx, ny];
            this.points.push(newPoint);
            this.points.sort((a, b) => a[0] - b[0]);
            this.draggingIndex = this.points.indexOf(newPoint);
            this.onChange(this.points);
            this.draw();
          }
        });

        const handleMouseMove = (e) => {
          const [nx, ny] = getCoord(e);
          
          if (this.draggingIndex !== -1) {
            const p = this.points[this.draggingIndex];
            
            // Horizontal constraints to maintain order
            if (this.draggingIndex === 0) {
              p[0] = 0;
            } else if (this.draggingIndex === this.points.length - 1) {
              p[0] = 1;
            } else {
              const prevX = this.points[this.draggingIndex - 1][0];
              const nextX = this.points[this.draggingIndex + 1][0];
              p[0] = Math.max(prevX + 0.001, Math.min(nextX - 0.001, nx));
            }
            p[1] = Math.max(0, Math.min(1, ny));
            
            this.onChange(this.points);
            this.draw();
          } else {
            // Update hover state
            const prevHover = this.hoverIndex;
            this.hoverIndex = findPoint(nx, ny);
            if (prevHover !== this.hoverIndex) {
              this.draw();
            }
          }
        };

        const handleMouseUp = () => {
          this.draggingIndex = -1;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }

      setHistogram(data) {
        this.histogram = data;
        // Find max robustly
        let max = 0;
        for (let i = 0; i < data.length; i++) if (data[i] > max) max = data[i];
        this.maxVal = max || 1;
        this.draw();
      }

      draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, w, h);

        // Histogram
        if (this.histogram) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.moveTo(0, h);
          for (let i = 0; i < 256; i++) {
            const val = (this.histogram[i] / this.maxVal) * h * 0.75;
            ctx.lineTo((i / 255) * w, h - val);
          }
          ctx.lineTo(w, h);
          ctx.fill();
        }

        // Grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < 4; i++) {
          const pos = (i / 4) * w;
          ctx.moveTo(pos, 0); ctx.lineTo(pos, h);
          ctx.moveTo(0, pos); ctx.lineTo(w, pos);
        }
        ctx.stroke();

        // Curve (Spline approximation)
        const lut = generateSplineLUT(this.points);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 256; i++) {
          const x = (i / 255) * w;
          const y = (1.0 - lut[i]) * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Points
        this.points.forEach((p, i) => {
          const isSelected = i === this.draggingIndex || i === this.hoverIndex;
          ctx.fillStyle = isSelected ? '#fff' : this.color;
          ctx.beginPath();
          ctx.arc(p[0] * w, (1.0 - p[1]) * h, isSelected ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fill();
          if (isSelected) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      }
    },

    /**
     * RegionsEditor Component
     */
    RegionsEditor: class {
      constructor({ container, regions, onChange }) {
        this.container = container;
        this.regions = regions.map(r => ({ ...r }));
        this.onChange = onChange;
        this.draggingIndex = -1;
        this.dragMode = null; // 'pos' | 'radius' | 'soft'
        
        this.wrap = document.createElement('div');
        this.wrap.className = 'w-100';
        
        this.canvas = document.createElement('canvas');
        this.canvas.width = 240;
        this.canvas.height = 160;
        this.canvas.className = 'rounded bg-dark-subtle border border-secondary shadow-sm d-block mx-auto mb-2';
        this.canvas.style.cursor = 'crosshair';
        this.ctx = this.canvas.getContext('2d');
        
        this.list = document.createElement('div');
        this.list.className = 'list-group list-group-sm mb-2';
        
        const btnGroup = document.createElement('div');
        btnGroup.className = 'd-flex gap-1';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-outline-primary btn-sm flex-grow-1';
        addBtn.innerHTML = '<i class="bi bi-plus-lg"></i> Add Region';
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.regions.length >= 8) return;
          this.regions.push({ x: 0.5, y: 0.5, r: 0.2, s: 0.1, op: 1 });
          this.render();
          this.onChange(this.regions);
        });

        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn btn-outline-secondary btn-sm';
        clearBtn.innerHTML = '<i class="bi bi-trash"></i>';
        clearBtn.title = "Clear all regions";
        clearBtn.onclick = (e) => {
          e.stopPropagation();
          this.regions = [];
          this.render();
          this.onChange(this.regions);
        };

        btnGroup.appendChild(addBtn);
        btnGroup.appendChild(clearBtn);

        this.wrap.appendChild(this.canvas);
        this.wrap.appendChild(this.list);
        this.wrap.appendChild(btnGroup);
        this.container.appendChild(this.wrap);
        
        this.#initEvents();
        this.render();
      }

      #initEvents() {
        const getCoord = (e) => {
          const rect = this.canvas.getBoundingClientRect();
          return [
            Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
            Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
          ];
        };

        this.canvas.addEventListener('mousedown', (e) => {
          const [nx, ny] = getCoord(e);
          let found = -1;
          for (let i = this.regions.length - 1; i >= 0; i--) {
            const r = this.regions[i];
            const d = Math.sqrt((r.x - nx)**2 + (r.y - ny)**2);
            if (d < 0.05) { found = i; break; }
          }
          this.draggingIndex = found;
          if (found !== -1) this.render();
        });

        window.addEventListener('mousemove', (e) => {
          if (this.draggingIndex === -1) return;
          const [nx, ny] = getCoord(e);
          const r = this.regions[this.draggingIndex];
          r.x = nx;
          r.y = ny;
          this.render();
          this.onChange(this.regions);
        });

        window.addEventListener('mouseup', () => {
          this.draggingIndex = -1;
          this.render();
        });
      }

      render() {
        // Draw canvas
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, w, h);
        
        // Background grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for(let i=1; i<4; i++) {
          ctx.beginPath(); ctx.moveTo(i*w/4, 0); ctx.lineTo(i*w/4, h); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i*h/4); ctx.lineTo(w, i*h/4); ctx.stroke();
        }

        this.regions.forEach((r, i) => {
          const active = i === this.draggingIndex;
          ctx.beginPath();
          ctx.arc(r.x * w, r.y * h, r.r * w, 0, Math.PI * 2);
          ctx.strokeStyle = r.op === 1 ? '#0d6efd' : '#dc3545';
          ctx.lineWidth = active ? 3 : 1.5;
          ctx.setLineDash(r.op === 1 ? [] : [5, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Center point
          ctx.fillStyle = active ? '#fff' : ctx.strokeStyle;
          ctx.beginPath();
          ctx.arc(r.x * w, r.y * h, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        // Update List
        this.list.innerHTML = '';
        this.regions.forEach((r, i) => {
          const item = document.createElement('div');
          item.className = 'list-group-item bg-transparent p-2';
          item.innerHTML = `
            <div class="d-flex align-items-center gap-2 mb-1">
              <select class="form-select form-select-sm op-select" style="width: 100px">
                <option value="1" ${r.op === 1 ? 'selected' : ''}>Add</option>
                <option value="-1" ${r.op === -1 ? 'selected' : ''}>Sub</option>
              </select>
              <div class="flex-grow-1"></div>
              <button class="btn btn-link btn-sm p-0 text-danger del-btn"><i class="bi bi-trash"></i></button>
            </div>
            <div class="row g-1">
              <div class="col-6">
                <label class="small text-body-secondary x-small">Size</label>
                <input type="range" class="form-range r-range" min="0.01" max="0.8" step="0.01" value="${r.r}">
              </div>
              <div class="col-6">
                <label class="small text-body-secondary x-small">Soft</label>
                <input type="range" class="form-range s-range" min="0" max="0.5" step="0.01" value="${r.s}">
              </div>
            </div>
          `;
          
          item.querySelector('.op-select').addEventListener('change', (e) => {
            r.op = parseInt(e.target.value);
            this.render();
            this.onChange(this.regions);
          });
          item.querySelector('.r-range').addEventListener('input', (e) => {
            r.r = parseFloat(e.target.value);
            this.render();
            this.onChange(this.regions);
          });
          item.querySelector('.s-range').addEventListener('input', (e) => {
            r.s = parseFloat(e.target.value);
            this.render();
            this.onChange(this.regions);
          });
          item.querySelector('.del-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.regions.splice(i, 1);
            this.render();
            this.onChange(this.regions);
          });
          
          this.list.appendChild(item);
        });
      }
    },

    /**
     * MaskEditor Component
     */
    MaskEditor: class {
      constructor({ container, maskData, background, onChange }) {
        this.container = container;
        this.onChange = onChange;
        this.isDrawing = false;
        this.brushMode = 'add'; // 'add' | 'sub'
        this.brushSize = 20;
        
        this.wrap = document.createElement('div');
        this.wrap.className = 'w-100 text-center';
        
        this.canvasWrap = document.createElement('div');
        this.canvasWrap.style.position = 'relative';
        this.canvasWrap.style.width = '240px';
        this.canvasWrap.style.height = '160px';
        this.canvasWrap.className = 'mx-auto mb-2 rounded border border-secondary shadow-sm overflow-hidden';

        // Background preview
        this.bg = document.createElement('img');
        this.bg.src = background;
        this.bg.style.position = 'absolute';
        this.bg.style.top = '0'; this.bg.style.left = '0';
        this.bg.style.width = '100%'; this.bg.style.height = '100%';
        this.bg.style.objectFit = 'cover';
        this.bg.style.opacity = '0.4';

        this.canvas = document.createElement('canvas');
        this.canvas.width = 240;
        this.canvas.height = 160;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0'; this.canvas.style.left = '0';
        this.canvas.style.width = '100%'; this.canvas.style.height = '100%';
        this.canvas.style.cursor = 'crosshair';
        this.ctx = this.canvas.getContext('2d');
        
        // Load initial mask
        if (maskData) {
          const img = new Image();
          img.onload = () => this.ctx.drawImage(img, 0, 0, 240, 160);
          img.src = maskData;
        } else {
          this.ctx.fillStyle = 'black';
          this.ctx.fillRect(0, 0, 240, 160);
        }

        const toolbar = document.createElement('div');
        toolbar.className = 'btn-group btn-group-sm w-100 mb-2';
        toolbar.innerHTML = `
          <button class="btn btn-outline-primary active" id="brush-add">Keep</button>
          <button class="btn btn-outline-danger" id="brush-sub">Remove</button>
          <button class="btn btn-outline-secondary" id="brush-clear">Clear</button>
        `;

        this.canvasWrap.appendChild(this.bg);
        this.canvasWrap.appendChild(this.canvas);
        this.wrap.appendChild(toolbar);
        this.wrap.appendChild(this.canvasWrap);
        this.container.appendChild(this.wrap);

        this.#initEvents(toolbar);
      }

      #initEvents(toolbar) {
        const addBtn = toolbar.querySelector('#brush-add');
        const subBtn = toolbar.querySelector('#brush-sub');
        const clearBtn = toolbar.querySelector('#brush-clear');

        addBtn.onclick = () => {
          this.brushMode = 'add';
          addBtn.classList.add('active');
          subBtn.classList.remove('active');
        };
        subBtn.onclick = () => {
          this.brushMode = 'sub';
          subBtn.classList.add('active');
          addBtn.classList.remove('active');
        };
        clearBtn.onclick = () => {
          this.ctx.fillStyle = 'black';
          this.ctx.fillRect(0, 0, 240, 160);
          this.#update();
        };

        const getPos = (e) => {
          const rect = this.canvas.getBoundingClientRect();
          const scaleX = this.canvas.width / rect.width;
          const scaleY = this.canvas.height / rect.height;
          return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
        };

        const draw = (e) => {
          if (!this.isDrawing) return;
          const [x, y] = getPos(e);
          this.ctx.globalCompositeOperation = 'source-over';
          this.ctx.fillStyle = this.brushMode === 'add' ? 'white' : 'black';
          this.ctx.beginPath();
          this.ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
          this.ctx.fill();
          this.#update();
        };

        this.canvas.onmousedown = (e) => { this.isDrawing = true; draw(e); };
        window.onmousemove = (e) => draw(e);
        window.onmouseup = () => { if(this.isDrawing) { this.isDrawing = false; this.#update(); } };
      }

      #update() {
        this.onChange(this.canvas.toDataURL());
      }
    }
  };
})();
