import {rgbToHex} from "./color-engine.ts";

export interface ExtractedImageColor {
  hex: string;
  population: number;
}

export interface ImagePaletteOptions {
  count?: number;
  maxSamples?: number;
}

interface ColorBin {
  key: number;
  weight: number;
  r: number;
  g: number;
  b: number;
}

export function extractImagePalette(
  rgba: Uint8Array | Uint8ClampedArray,
  {count = 5, maxSamples = 65_536}: ImagePaletteOptions = {},
): ExtractedImageColor[] {
  if (!(rgba instanceof Uint8Array || rgba instanceof Uint8ClampedArray) || rgba.length % 4) {
    throw new Error("Image pixels must be RGBA bytes.");
  }
  if (!Number.isInteger(count) || count < 1 || count > 16 || !Number.isInteger(maxSamples) || maxSamples < 1) {
    throw new Error("Invalid extraction limits.");
  }
  const bins = new Map<number, ColorBin>();
  const stride = Math.max(1, Math.ceil(rgba.length / 4 / maxSamples));
  let total = 0;
  for (let offset = 0; offset < rgba.length; offset += stride * 4) {
    const alpha = rgba[offset + 3]! / 255;
    if (alpha === 0) continue;
    const r = rgba[offset]!, g = rgba[offset + 1]!, b = rgba[offset + 2]!;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bin = bins.get(key) ?? {key, weight: 0, r: 0, g: 0, b: 0};
    bin.weight += alpha;
    bin.r += r * alpha;
    bin.g += g * alpha;
    bin.b += b * alpha;
    bins.set(key, bin);
    total += alpha;
  }
  return [...bins.values()]
    .sort((a, b) => b.weight - a.weight || a.key - b.key)
    .slice(0, count)
    .map((bin) => ({
      hex: rgbToHex({r: bin.r / bin.weight, g: bin.g / bin.weight, b: bin.b / bin.weight}),
      population: bin.weight / total,
    }));
}

