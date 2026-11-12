import type {Swatch} from "./palette-store.ts";

interface PaletteLike {
  id: string;
  name: string;
  harmonyType: string;
  colors: Swatch[];
}

export interface PaletteComparisonRow {
  id: string;
  current: Swatch | null;
  saved: Swatch | null;
  changed: boolean;
}

export function snapshotPalette<T extends PaletteLike>(palette: T, name?: string): Omit<T, "id" | "name"> & {
  id: string;
  name: string;
  versionOf: string;
  savedAt: string;
} {
  return {
    ...structuredClone(palette),
    id: crypto.randomUUID(),
    name: name || palette.name,
    versionOf: palette.id,
    savedAt: new Date().toISOString(),
  };
}

export function restorePalette<T extends PaletteLike>(current: T, snapshot: Pick<PaletteLike, "colors" | "harmonyType">): T {
  return {...current, colors: structuredClone(snapshot.colors), harmonyType: snapshot.harmonyType};
}

export function comparePalettes(current: PaletteLike, saved: PaletteLike): PaletteComparisonRow[] {
  const ids = [...new Set([...current.colors, ...saved.colors].map((color) => color.id))];
  return ids.map((id) => {
    const currentIndex = current.colors.findIndex((color) => color.id === id);
    const savedIndex = saved.colors.findIndex((color) => color.id === id);
    const a = current.colors[currentIndex] ?? null;
    const b = saved.colors[savedIndex] ?? null;
    return {
      id,
      current: structuredClone(a),
      saved: structuredClone(b),
      changed: !a || !b || a.hex !== b.hex || (a.opacity ?? 1) !== (b.opacity ?? 1)
        || a.name !== b.name || a.locked !== b.locked || currentIndex !== savedIndex,
    };
  });
}

