import { normalizeHex } from "../domain/color-engine.js";
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
}
export function fixtureOptions(fixtures,selectedId) {
  return fixtures.map((fixture)=>`<option value="${escapeHtml(fixture.id)}" ${fixture.id===selectedId ? "selected" : ""}>${escapeHtml(fixture.name)}</option>`).join("");
}
export function swatchButton(swatch,activeId) {
  const hex=normalizeHex(swatch.hex);
  if (!hex) throw new Error("Invalid swatch color.");
  return `<button class="swatch ${activeId===swatch.id ? "is-selected" : ""}" data-swatch="${escapeHtml(swatch.id)}" aria-label="${escapeHtml(swatch.name)} ${hex}"><span style="background:${hex}"></span><b>${escapeHtml(swatch.name)}</b><small>${hex}</small>${swatch.locked ? "<em>⌁</em>" : ""}</button>`;
}
