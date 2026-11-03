import { escapeHtml } from "./html.js";
import { validCanvasObjects } from "../domain/canvas.js";
export function canvasObjectMarkup(object,selected=false) {
  if (object.type==="ellipse") return `<ellipse cx="${object.x+object.width/2}" cy="${object.y+object.height/2}" rx="${object.width/2}" ry="${object.height/2}" fill="${object.fill}" ${selected ? 'stroke="#22D3EE" stroke-width="3"' : ""}/>`;
  return object.type==="rect" ? `<rect x="${object.x}" y="${object.y}" width="${object.width}" height="${object.height}" fill="${object.fill}" ${selected ? 'stroke="#22D3EE" stroke-width="3"' : ""}/>` : `<text x="${object.x}" y="${object.y}" font-size="${object.fontSize}" fill="${object.fill}" ${selected ? 'text-decoration="underline"' : ""}>${escapeHtml(object.text)}</text>`;
}
export function canvasMarkup(objects,selectedId,label) {
  if (!validCanvasObjects(objects)) throw new Error("Invalid canvas data.");
  return `<svg class="design-canvas" viewBox="0 0 800 450" role="group" aria-label="${escapeHtml(label)}">${objects.map((object)=>`<g data-canvas-object="${escapeHtml(object.id)}" tabindex="0" role="button" aria-pressed="${object.id===selectedId}" aria-label="${escapeHtml(object.type==="text" ? object.text : object.type)}">${canvasObjectMarkup(object,object.id===selectedId)}${object.id===selectedId && object.type!=="text" ? `<rect data-canvas-resize="" aria-hidden="true" x="${object.x+object.width-6}" y="${object.y+object.height-6}" width="12" height="12" fill="#22D3EE" stroke="#0B1220" style="cursor:nwse-resize"/>` : ""}</g>`).join("")}</svg>`;
}
