export const toolKeys=Object.freeze({v:"select",b:"paletteBrush",l:"fixture",m:"material",t:"text",s:"shapes",r:"measure",o:"orbit",a:"aiPin"});
export function toolShortcut(event){
  if(!event || event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.isComposing || event.defaultPrevented || isEditableTarget(event.target))return null;
  const key=String(event.key).toLowerCase();return Object.hasOwn(toolKeys,key) ? toolKeys[key] : null;
}
export function editorShortcut(event) {
  if (!event?.ctrlKey && !event?.metaKey) return null;
  const key=String(event.key).toLowerCase();
  if (key === "s") return "save";
  if (key === "z" && event.shiftKey) return "redo";
  if (key === "z") return "undo";
  return null;
}

export function isEditableTarget(target) { return Boolean(target?.isContentEditable || ["INPUT","TEXTAREA","SELECT"].includes(target?.tagName)); }
