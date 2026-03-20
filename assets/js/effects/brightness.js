export default {
  id: "brightness",
  name: "Brightness",
  icon: "bi-sun",
  description: "Adjusts exposure/brightness.",
  controls: [
    { key: "amount", label: "Amount", type: "range", min: -100, max: 100, step: 1, unit: "%" },
  ],
  defaultParams: { amount: 0 },
  getFilter(params) {
    const amount = Number(params.amount ?? 0);
    if (!Number.isFinite(amount) || amount === 0) return null;
    const percent = Math.max(0, 100 + amount);
    return `brightness(${percent}%)`;
  },
};

