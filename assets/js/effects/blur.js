export default {
  id: "blur",
  name: "Blur",
  icon: "bi-droplet",
  description: "Softens the image using a blur filter.",
  controls: [
    { key: "radius", label: "Radius", type: "range", min: 0, max: 20, step: 0.5, unit: "px" },
  ],
  defaultParams: { radius: 0 },
  getFilter(params) {
    const radius = Number(params.radius ?? 0);
    if (!Number.isFinite(radius) || radius <= 0) return null;
    return `blur(${radius}px)`;
  },
};

