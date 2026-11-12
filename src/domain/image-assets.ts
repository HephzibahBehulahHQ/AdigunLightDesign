export interface DecodedImageAssetInput {
  pixels: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  name?: string;
}

export interface ImageAsset {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  name: string;
}

export interface ImageAssetSummary {
  id: string;
  width: number;
  height: number;
  name: string;
}

export interface ImageAssetStore {
  add(input: DecodedImageAssetInput): string;
  get(id: string): ImageAsset | null;
  list(): ImageAssetSummary[];
  clear(): void;
  readonly size: number;
}

export function createImageAssetStore(maxAssets = 5): ImageAssetStore {
  if (!Number.isInteger(maxAssets) || maxAssets < 1 || maxAssets > 20) throw new Error("Invalid image asset limit.");
  const assets = new Map<string, ImageAsset>();
  return {
    add({pixels, width, height, name = "Local image"}) {
      if (!(pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray)
        || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
        || width > 256 || height > 256 || pixels.length !== width * height * 4 || typeof name !== "string") {
        throw new Error("Invalid decoded image asset.");
      }
      const id = crypto.randomUUID();
      assets.set(id, {pixels: new Uint8ClampedArray(pixels), width, height, name});
      while (assets.size > maxAssets) {
        const oldestId = assets.keys().next().value;
        if (oldestId !== undefined) assets.delete(oldestId);
      }
      return id;
    },
    get(id) {
      const asset = assets.get(id);
      return asset ? {...asset, pixels: new Uint8ClampedArray(asset.pixels)} : null;
    },
    list() {
      return [...assets].map(([id, {width, height, name}]) => ({id, width, height, name}));
    },
    clear() {
      assets.clear();
    },
    get size() {
      return assets.size;
    },
  };
}

