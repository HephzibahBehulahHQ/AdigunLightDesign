export const previewQualities=Object.freeze({
  performance:Object.freeze({fixtures:12,pixelRatio:1,columns:10,rows:8,beamSegments:12}),
  balanced:Object.freeze({fixtures:12,pixelRatio:1.5,columns:20,rows:16,beamSegments:24}),
  quality:Object.freeze({fixtures:32,pixelRatio:2,columns:32,rows:24,beamSegments:40})
});
export function previewQuality(name: unknown) {
  return name==="performance" || name==="balanced" || name==="quality" ? previewQualities[name] : previewQualities.balanced;
}
