export function editorShortcut(event) {
  if (!event?.ctrlKey && !event?.metaKey) return null;
  const key=String(event.key).toLowerCase();
  if (key === "s") return "save";
  if (key === "z" && event.shiftKey) return "redo";
  if (key === "z") return "undo";
  return null;
}

export function isEditableTarget(target) { return Boolean(target?.isContentEditable || ["INPUT","TEXTAREA","SELECT"].includes(target?.tagName)); }
