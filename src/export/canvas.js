import { canvasObjectMarkup } from "../ui/canvas.js";
import { escapeHtml } from "../ui/html.js";
import { validCanvasObjects } from "../domain/canvas.js";
export function canvasSvg(objects,title="AdigunLightDesign") {
  if (!Array.isArray(objects) || !validCanvasObjects(objects)) throw new Error("Invalid canvas artwork.");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><title>${escapeHtml(title)}</title>${objects.map((object)=>canvasObjectMarkup(object)).join("")}</svg>`;
}
