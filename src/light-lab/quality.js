export const previewQualities=Object.freeze({
  performance:Object.freeze({fixtures:4,pixelRatio:1,columns:10,rows:8}),
  balanced:Object.freeze({fixtures:12,pixelRatio:1.5,columns:20,rows:16}),
  quality:Object.freeze({fixtures:32,pixelRatio:2,columns:32,rows:24})
});
export function previewQuality(name) {return Object.hasOwn(previewQualities,name) ? previewQualities[name] : previewQualities.balanced;}
