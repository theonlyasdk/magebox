export function rgbToHex(r, g, b) {
  const to = (n) => Number(n).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

