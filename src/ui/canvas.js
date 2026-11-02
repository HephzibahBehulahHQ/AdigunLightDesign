import { escapeHtml } from "./html.js";
import { validCanvasObjects } from "../domain/canvas.js";
export function canvasObjectMarkup(object,selected=false) {
  return object.type==="rect" ? `<rect x="${object.x}" y="${object.y}" width="${object.width}" height="${object.height}" fill="${object.fill}" ${selected ? 'stroke="#22D3EE" stroke-width="3"' : ""}/>` : `<text x="${object.x}" y="${object.y}" font-size="${object.fontSize}" fill="${object.fill}" ${selected ? 'text-decoration="underline"' : ""}>${escapeHtml(object.text)}</text>`;
}
export function canvasMarkup(objects,selectedId,label) {
  if (!validCanvasObjects(objects)) throw new Error("Invalid canvas data.");
  return `<svg class="design-canvas" viewBox="0 0 800 450" role="group" aria-label="${escapeHtml(label)}">${objects.map((object)=>`<g data-canvas-object="${escapeHtml(object.id)}" tabindex="0" role="button" aria-pressed="${object.id===selectedId}" aria-label="${escapeHtml(object.type==="text" ? object.text : object.type)}">${canvasObjectMarkup(object,object.id===selectedId)}</g>`).join("")}</svg>`;
}
