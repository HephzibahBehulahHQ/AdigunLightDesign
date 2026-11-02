export function snapshotPalette(palette,name) {
  return {...structuredClone(palette),id:crypto.randomUUID(),name:name || palette.name,versionOf:palette.id,savedAt:new Date().toISOString()};
}
export function restorePalette(current,snapshot) {
  return {...current,colors:structuredClone(snapshot.colors),harmonyType:snapshot.harmonyType};
}
