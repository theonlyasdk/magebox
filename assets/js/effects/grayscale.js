export default {
  id: "grayscale",
  name: "Grayscale",
  icon: "bi-droplet-half",
  description: "Converts colors to grayscale.",
  controls: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 100, step: 1, unit: "%" },
  ],
  defaultParams: { amount: 100 },
  getFilter(params) {
    const amount = Number(params.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return `grayscale(${amount}%)`;
  },
};

