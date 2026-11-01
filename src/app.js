import { createProject, validateProject } from "./domain/project.js";
import { contrastResult, normalizeHex } from "./domain/color-engine.js";
import { paletteCssVariables, rerollUnlocked, starterPalette, updateSwatch } from "./domain/palette-store.js";
import { supportedLocales, translate } from "./i18n.js";
import { createLightLabRenderer } from "./light-lab/renderer.js";
import { blackout, createFixture, dmxFrame, patchFixture } from "./dmx/engine.js";

const storageKey = "adigunlightdesign/project-v1";
const preferencesKey = "adigunlightdesign/preferences-v1";
const app = document.querySelector("#app");
const defaults = { locale:"en", theme:"dark", module:"canvas", view:"palette", tool:"select", selected:"deep-blue", luxOpen:true, harmony:"analogous", seed:"#2196F3" };
const preferences = { ...defaults, ...safeParse(localStorage.getItem(preferencesKey)) };
let project = loadProject();
let undoStack = [], redoStack = [], status = "", renderer = null;

function safeParse(value) { try { return JSON.parse(value) ?? {}; } catch { return {}; } }
function loadProject() {
  const loaded = safeParse(localStorage.getItem(storageKey));
  if (validateProject(loaded).valid && loaded.palettes?.[0]?.colors) return loaded;
  const fresh = createProject({ name:"Studio Mood" });
  fresh.palettes = [{ id:"studio-modern", name:"Studio Modern", harmonyType:"analogous", colors:starterPalette }];
  return fresh;
}
function t(key) { return translate(preferences.locale, key); }
function palette() { return project.palettes[0]; }
function selected() { return palette().colors.find((swatch) => swatch.id === preferences.selected) ?? palette().colors[0]; }
function scene() { if (!project.scenes[0]) project.scenes.push({ id:"studio-room", name:"Studio room", materialColor:"#C21888" }); return project.scenes[0]; }
function addVirtualFixture() { const fixture=createFixture(project.fixtures.length+1); project.fixtures=patchFixture([...project.fixtures,fixture],fixture.id); saveProject(); status=`${fixture.name} patched to Universe 1 / ${fixture.patchAssignment?.startAddress ?? 1}.`; }
function activateBlackout() { project.fixtures=blackout(project.fixtures); saveProject(); status="Virtual blackout applied. Physical output remains disabled."; }
function savePreferences() { localStorage.setItem(preferencesKey, JSON.stringify(preferences)); }
function saveProject() { project.updatedAt = new Date().toISOString(); localStorage.setItem(storageKey, JSON.stringify(project)); status = t("statusSaved"); }
function pushChange(nextColours) { undoStack.push(structuredClone(palette().colors)); redoStack = []; palette().colors = nextColours; saveProject(); }
function mutateColours(fn) { pushChange(fn(structuredClone(palette().colors))); render(); }
function undo() { if (!undoStack.length) return setStatus(t("noUndo")); redoStack.push(structuredClone(palette().colors)); palette().colors = undoStack.pop(); saveProject(); status = t("statusUndo"); render(); }
function redo() { if (!redoStack.length) return setStatus(t("noRedo")); undoStack.push(structuredClone(palette().colors)); palette().colors = redoStack.pop(); saveProject(); status = t("statusRedo"); render(); }
function setStatus(value) { status = value; render(); }
function esc(value) { return String(value).replace(/[&<>"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"})[char]); }
function disabled(title) { return `disabled title="${esc(title)}"`; }

function render() {
  renderer?.destroy(); renderer = null;
  document.documentElement.lang = preferences.locale;
  document.documentElement.dataset.theme = preferences.theme;
  const active = selected();
  const contrast = contrastResult(active.hex, "#0B1220");
  const nav = [
    ["canvas", "⌂", true], ["palette", "◉", true], ["light", "☼", true], ["copilot", "◌", true], ["library", "▱", false], ["export", "↗", false], ["community", "♧", false]
  ].map(([key, icon, enabled]) => `<button class="module ${preferences.module === key ? "is-active" : ""}" data-module="${key}" ${enabled ? "" : disabled(`${t(key)} is scheduled after the current milestone.`)}><span>${icon}</span>${t(key)}</button>`).join("");
  const tools = [["select","↖",true],["paletteBrush","◉",true],["fixture","☀",true],["material","◆",true],["shapes","□",false],["text","T",false],["measure","⌗",false],["orbit","◎",true],["aiPin","✦",false]].map(([key, icon, enabled]) => `<button class="tool ${preferences.tool === key ? "is-active" : ""}" data-tool="${key}" ${enabled ? "" : disabled(`${t(key)} is available with the 3D editor milestone.`)}><span>${icon}</span>${t(key)}</button>`).join("");
  const swatches = palette().colors.map((swatch) => `<button class="swatch ${active.id === swatch.id ? "is-selected" : ""}" data-swatch="${swatch.id}" aria-label="${esc(swatch.name)} ${swatch.hex}"><span style="background:${swatch.hex}"></span><b>${esc(swatch.name)}</b><small>${swatch.hex}</small>${swatch.locked ? "<em>⌁</em>" : ""}</button>`).join("");
  const patchedFixtures = project.fixtures.filter((fixture) => fixture.patchAssignment);
  const virtualFrame = dmxFrame(project.fixtures);
  app.innerHTML = `
    <header class="topbar">
      <div class="brand-lockup" aria-label="Hephzibah Behulah, HB Elektroniker, AdigunLightDesign">
        <img class="corporate-mark" src="https://raw.githubusercontent.com/HephzibahBehulahHQ/hb-design-system/main/assets/corporate/hephzibah-behulah-official.jpg" alt="Hephzibah Behulah" onerror="this.hidden=true;this.nextElementSibling.hidden=false" />
        <span class="brand-fallback" hidden>HB <b>Hephzibah Behulah</b></span><span class="brand-divider"></span><span class="division">⚡ HB Elektroniker</span>
      </div>
      <div class="product-lockup"><strong>Adigun<span>Light</span>Design</strong><small>Unified Color &amp; Light Design Studio</small></div>
      <div class="utility-controls"><label class="language"><span>◎</span><select id="locale" aria-label="Language">${supportedLocales.map((locale) => `<option value="${locale}" ${locale === preferences.locale ? "selected" : ""}>${locale.toUpperCase()}</option>`).join("")}</select></label><button id="theme" class="icon-button" title="${t("appearance")}" aria-label="${t("appearance")}">${preferences.theme === "dark" ? "☼" : "◐"}</button><span class="offline-pill" title="No account or cloud service is configured">● ${t("offline")}</span></div>
    </header>
    <nav class="module-nav" aria-label="Application modules">${nav}</nav>
    <main id="workspace" class="editor-layout">
      <aside class="left-rail panel">
        <section class="project-heading"><div><small>${t("project")}</small><input id="project-name" value="${esc(project.name)}" aria-label="${t("project")} name" /></div><span class="save-state">● ${t("saved")}</span></section>
        <section><h2>▰ ${t("layers")}</h2><ul class="layer-list"><li>⌄ ▣ Lighting layer <span>◉</span></li><li>⌄ ▣ Palette layer <span>◉</span></li><li>⌄ ▣ Scene &amp; props <span>◉</span></li></ul></section>
        <section class="tool-section"><h2>☼ ${t("tools")}</h2><div class="tool-list">${tools}</div></section>
      </aside>
      <section class="work-area">
        <div class="workspace-tabs panel"><button class="tab ${preferences.view === "palette" ? "is-active" : ""}" data-view="palette">2D ${t("palette")}</button><button class="tab ${preferences.view === "light" ? "is-active" : ""}" data-view="light">3D ${t("light")}</button><span></span><button class="view-menu" ${preferences.view === "light" ? "" : disabled("Select 3D Light Lab to use perspective orbit.")}>Perspective⌄</button></div>
        ${preferences.view === "light" ? `<div class="scene-preview light-canvas panel"><div class="scene-title"><b>3D ${t("light")}</b><small>WebGL artistic previsualization · M3</small></div><canvas id="light-canvas" tabindex="0" aria-label="Interactive 3D studio preview; drag to orbit camera"></canvas><div class="canvas-actions"><button id="apply-scene">${t("apply")} ${t("selectedColour")}</button><button id="reset-camera">Reset camera</button></div></div>` : `<div class="scene-preview panel" role="img" aria-label="${t("scenePreview")}"><div class="scene-title"><b>${t("scenePreview")}</b><small>${t("sceneNote")}</small></div><div class="beam beam-blue"></div><div class="beam beam-amber"></div><div class="beam beam-magenta"></div><div class="stage-truss"></div><div class="scene-wall"><div class="art-frame"></div><div class="couch"></div><div class="plant plant-left"></div><div class="plant plant-right"></div><div class="lamp"></div></div><div class="axis"><i>X</i><b>Y</b><em>Z</em></div></div>`}
        <div class="lower-workspace"><section class="palette-panel panel"><div class="section-title"><h2>◉ ${t("activePalette")} — ${esc(palette().name)}</h2><button id="copy-css" class="subtle" title="${t("exportCss")}">▣</button></div><div class="swatches">${swatches}</div><div class="palette-actions"><input id="seed" value="${preferences.seed}" aria-label="Seed colour" maxlength="7" /><select id="harmony" aria-label="${t("harmony")}">${["analogous","complementary","splitComplementary","triadic","tetradic","square","monochromatic"].map((type) => `<option value="${type}" ${type === preferences.harmony ? "selected" : ""}>${type}</option>`).join("")}</select><button id="reroll">⟳ ${t("reroll")}</button><button id="add-colour">＋ ${t("add")}</button></div></section>
          <section class="timeline panel"><div class="section-title"><h2>◌ ${t("virtualDmx")}</h2><span class="m-badge">M4 · simulation only</span></div><p>${project.fixtures.length ? `Universe 1 · ${patchedFixtures.length}/${project.fixtures.length} fixtures patched · channels 1–${Math.max(0,...patchedFixtures.map((fixture)=>fixture.patchAssignment.startAddress+fixture.patchAssignment.channelFootprint-1))} active.` : "No virtual fixtures yet. Add a tested generic RGB wash to begin offline simulation."}</p><div class="dmx-actions"><button id="add-fixture">＋ Add RGB wash</button><button id="blackout" ${project.fixtures.length ? "" : "disabled"}>◼ Blackout</button><span>CH 1: ${virtualFrame[0]} · Output: disabled</span></div><div class="timeline-lines" aria-hidden="true"><i></i><i></i><i></i></div></section></div>
      </section>
      <aside class="inspector panel"><div class="section-title"><h2>◈ ${t("inspector")}</h2><button class="subtle" disabled title="Inspector follows the selected palette swatch">×</button></div><div class="inspector-tabs"><button class="is-active">${t("palette")}</button><button disabled>Light</button><button disabled>DMX</button><button disabled>Effects</button></div><div class="selected-preview" style="--selected:${active.hex}"></div><label>${t("colourName")}<input id="swatch-name" value="${esc(active.name)}" /></label><label>${t("hex")}<div class="input-row"><input id="swatch-hex" value="${active.hex}" spellcheck="false" /><button id="apply-colour">${t("apply")}</button></div></label><button id="lock-swatch" class="wide">${active.locked ? "⌁ " + t("unlock") : "⌁ " + t("lock")}</button><section class="contrast-card"><h3>${t("contrast")}</h3><b>${contrast.ratio.toFixed(2)} : 1</b><span class="${contrast.aa ? "pass" : "fail"}">AA ${contrast.aa ? "pass" : "review"}</span><small>Against Midnight Navy #0B1220</small></section></aside>
      <aside class="lux-panel panel ${preferences.luxOpen ? "" : "is-collapsed"}"><div class="lux-heading"><div><span class="lux-icon">✦</span><h2>Lux <small>— AI Co-Pilot</small></h2></div><button id="toggle-lux" class="subtle" aria-label="${preferences.luxOpen ? t("closePanel") : t("openLux")}">${preferences.luxOpen ? "×" : "✦"}</button></div>${preferences.luxOpen ? `<p class="lux-subtitle">Your color &amp; light design assistant</p><div class="lux-message"><b>Lux · ${t("offline")}</b><p>${t("luxUnavailable")}</p><ul><li>Palette and project context are kept local.</li><li>No project data is sent anywhere.</li></ul></div><form id="lux-form" class="lux-input"><input id="lux-question" placeholder="Ask Lux anything…" aria-label="Ask Lux" /><button>➤</button></form>` : ""}</aside>
    </main>
    <footer><span>${t("footer")}</span><span id="status" role="status" aria-live="polite">${status}</span><div><button id="save">${t("save")}</button><button id="undo" ${undoStack.length ? "" : "disabled"}>↶ ${t("undo")}</button><button id="redo" ${redoStack.length ? "" : "disabled"}>↷ ${t("redo")}</button></div></footer>`;
  bind();
  if (preferences.view === "light") renderer = createLightLabRenderer(document.querySelector("#light-canvas"), { accent:scene().materialColor });
}

function bind() {
  document.querySelector("#locale").onchange = (event) => { preferences.locale = event.target.value; savePreferences(); status = t("statusLocale"); render(); };
  document.querySelector("#theme").onclick = () => { preferences.theme = preferences.theme === "dark" ? "light" : "dark"; savePreferences(); status = t("statusTheme"); render(); };
  document.querySelectorAll("[data-module]").forEach((button) => button.onclick = () => { const key = button.dataset.module; if (key === "copilot") preferences.luxOpen = true; else preferences.module = key; status = t("statusModule") + button.textContent.trim(); render(); });
  document.querySelectorAll("[data-view]").forEach((button) => button.onclick = () => { preferences.view = button.dataset.view; savePreferences(); render(); });
  document.querySelectorAll("[data-tool]").forEach((button) => button.onclick = () => { preferences.tool = button.dataset.tool; status = t("statusTool") + button.textContent.trim(); render(); });
  document.querySelectorAll("[data-swatch]").forEach((button) => button.onclick = () => { preferences.selected = button.dataset.swatch; render(); });
  document.querySelector("#project-name").onchange = (event) => { project.name = event.target.value.trim() || project.name; saveProject(); render(); };
  document.querySelector("#seed").onchange = (event) => { const hex = normalizeHex(event.target.value); if (hex) preferences.seed = hex; event.target.value = preferences.seed; savePreferences(); };
  document.querySelector("#harmony").onchange = (event) => { preferences.harmony = event.target.value; savePreferences(); };
  document.querySelector("#reroll").onclick = () => mutateColours((colours) => rerollUnlocked(colours, preferences.seed, preferences.harmony));
  document.querySelector("#add-colour").onclick = () => mutateColours((colours) => { const id = `swatch-${Date.now()}`; preferences.selected = id; return [...colours, { id, name:`Swatch ${colours.length + 1}`, hex:preferences.seed, locked:false }]; });
  document.querySelector("#apply-colour").onclick = () => { const name = document.querySelector("#swatch-name").value.trim(), hex = normalizeHex(document.querySelector("#swatch-hex").value); if (!hex) return setStatus("Enter a valid 3- or 6-digit HEX value."); mutateColours((colours) => updateSwatch(colours, selected().id, { name:name || selected().name, hex })); };
  document.querySelector("#lock-swatch").onclick = () => mutateColours((colours) => updateSwatch(colours, selected().id, { locked:!selected().locked }));
  document.querySelector("#copy-css").onclick = () => downloadCss();
  document.querySelector("#save").onclick = () => { saveProject(); render(); };
  document.querySelector("#undo").onclick = undo; document.querySelector("#redo").onclick = redo;
  document.querySelector("#toggle-lux").onclick = () => { preferences.luxOpen = !preferences.luxOpen; savePreferences(); render(); };
  const applyScene = document.querySelector("#apply-scene"); if (applyScene) applyScene.onclick = () => { scene().materialColor = selected().hex; saveProject(); renderer.setAccent(selected().hex); status = `${t("apply")} ${selected().hex}`; document.querySelector("#status").textContent = status; };
  const resetCamera = document.querySelector("#reset-camera"); if (resetCamera) resetCamera.onclick = () => renderer.reset();
  document.querySelector("#add-fixture").onclick = () => { addVirtualFixture(); render(); };
  document.querySelector("#blackout").onclick = () => { activateBlackout(); render(); };
  const form = document.querySelector("#lux-form"); if (form) form.onsubmit = (event) => { event.preventDefault(); setStatus(t("luxUnavailable")); };
}
function downloadCss() { const file = new Blob([paletteCssVariables(palette().colors)], { type:"text/css" }); const link = document.createElement("a"); link.href = URL.createObjectURL(file); link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-palette.css`; link.click(); URL.revokeObjectURL(link.href); setStatus(t("statusExport")); }
render();
