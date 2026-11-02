export function snapshotPalette(palette,name) {
  return {...structuredClone(palette),id:crypto.randomUUID(),name:name || palette.name,versionOf:palette.id,savedAt:new Date().toISOString()};
}
export function restorePalette(current,snapshot) {
  return {...current,colors:structuredClone(snapshot.colors),harmonyType:snapshot.harmonyType};
}
export function comparePalettes(current,saved) {
  const ids=[...new Set([...current.colors,...saved.colors].map((color)=>color.id))];
  return ids.map((id)=>{
    const currentIndex=current.colors.findIndex((color)=>color.id===id),savedIndex=saved.colors.findIndex((color)=>color.id===id);
    const a=current.colors[currentIndex] ?? null,b=saved.colors[savedIndex] ?? null;
    return {id,current:structuredClone(a),saved:structuredClone(b),changed:!a || !b || a.hex!==b.hex || a.name!==b.name || a.locked!==b.locked || currentIndex!==savedIndex};
  });
}
