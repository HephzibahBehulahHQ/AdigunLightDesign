const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;

export function normalizeHex(value) {
  const clean = String(value).trim().replace(/^#/, "");
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(clean)) return null;
  const full = clean.length === 3 ? [...clean].map((char) => char + char).join("") : clean;
  return `#${full.toUpperCase()}`;
}

export function hexToRgb(value) {
  const hex = normalizeHex(value);
  if (!hex) return null;
  const number = Number.parseInt(hex.slice(1), 16);
  return { r: number >> 16, g: (number >> 8) & 255, b: number & 255 };
}

export function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function rgbToHsl(rgb) {
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = 60 * mod((g - b) / d, 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  const l = (max + min) / 2;
  return { h, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
}

export function hslToRgb({ h, s, l }) {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(mod(h / 60, 2) - 1));
  const m = l - chroma / 2;
  const [r, g, b] = h < 60 ? [chroma, x, 0] : h < 120 ? [x, chroma, 0] : h < 180 ? [0, chroma, x] : h < 240 ? [0, x, chroma] : h < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function shiftHue(hex, degrees, { saturation, lightness } = {}) {
  const rgb = hexToRgb(hex); if (!rgb) throw new Error("A valid HEX colour is required.");
  const hsl = rgbToHsl(rgb);
  return rgbToHex(hslToRgb({ h: mod(hsl.h + degrees, 360), s: saturation ?? hsl.s, l: lightness ?? hsl.l }));
}

export function harmony(seed, type = "analogous") {
  const steps = { complementary:[0, 180], splitComplementary:[0, 150, 210], analogous:[-30, 0, 30, 60, -60], triadic:[0, 120, 240], tetradic:[0, 90, 180, 270], square:[0, 90, 180, 270], monochromatic:[0, 0, 0, 0, 0] }[type] ?? [0];
  return steps.map((step, index) => type === "monochromatic" ? shiftHue(seed, 0, { lightness: [0.2, 0.35, 0.5, 0.65, 0.8][index] }) : shiftHue(seed, step));
}

function linear(channel) { const c = channel / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }
export function luminance(hex) { const rgb = hexToRgb(hex); if (!rgb) return null; return .2126 * linear(rgb.r) + .7152 * linear(rgb.g) + .0722 * linear(rgb.b); }
export function contrastRatio(a, b) { const l1 = luminance(a), l2 = luminance(b); if (l1 === null || l2 === null) return null; return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); }
export function contrastResult(a, b) { const ratio = contrastRatio(a, b); return { ratio, aa: ratio >= 4.5, aaa: ratio >= 7, largeAa: ratio >= 3 }; }
