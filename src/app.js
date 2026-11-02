import { validateProject } from "./domain/project.js";
import { createStudioMoodProject } from "./domain/studio-mood.js";
import { contrastResult, hexToRgb, isSrgbGamut, normalizeHex, rgbToHex, rgbToHsl, rgbToHsv, rgbToLab, rgbToOklab } from "./domain/color-engine.js";
import { paletteCssVariables, rerollUnlocked, starterPalette, updateSwatch } from "./domain/palette-store.js";
import { supportedLocales, translate } from "./i18n.js";
import { createLightLabRenderer } from "./light-lab/renderer.js";
import { blackout, createFixture, dmxFrame, fixtureProfiles, getFixtureProfile, patchFixture, updateFixture } from "./dmx/engine.js";
import { createCue, editCue, evaluateCue } from "./timeline/engine.js";
import { cueCsv, paletteCss, paletteJson, patchCsv, projectJson, safeFileStem } from "./export/formats.js";
import { readProjectFile } from "./domain/import-project.js";
import { editorShortcut, isEditableTarget } from "./accessibility/shortcuts.js";
import { commitTransaction, redoTransaction, undoTransaction } from "./domain/history.js";

const storageKey = "adigunlightdesign/project-v1";
const preferencesKey = "adigunlightdesign/preferences-v1";
const app = document.querySelector("#app");
const defaults = { locale:"en", theme:"dark", module:"canvas", view:"palette", tool:"select", selected:"deep-blue", luxOpen:true, harmony:"analogous", seed:"#2196F3" };
const preferences = { ...defaults, ...safeParse(localStorage.getItem(preferencesKey)) };
let project = loadProject();
let undoStack = [], redoStack = [], status = "", renderer = null, playbackTimer = null;

function safeParse(value) { try { return JSON.parse(value) ?? {}; } catch { return {}; } }
function loadProject() {
  const loaded = safeParse(localStorage.getItem(storageKey));
  if (validateProject(loaded).valid && loaded.palettes?.[0]?.colors) return loaded;
  return createStudioMoodProject();
}
function t(key) { return translate(preferences.locale, key); }
function phrase(key, values = {}) { return t(key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? ""); }
function palette() { return project.palettes[0]; }
function selected() { return palette().colors.find((swatch) => swatch.id === preferences.selected) ?? palette().colors[0]; }
function scene() { if (!project.scenes[0]) project.scenes.push({ id:"studio-room", name:"Studio room", materialColor:"#C21888" }); return project.scenes[0]; }
function addVirtualFixture(profileId) { const fixture=createFixture(project.fixtures.length+1,profileId); commitProjectChange("fixture-add",(draft)=>{draft.fixtures=patchFixture([...draft.fixtures,fixture],fixture.id);}); preferences.fixtureId=fixture.id;savePreferences(); const patch=project.fixtures.find((item)=>item.id===fixture.id)?.patchAssignment; status=phrase("fixturePatched",{name:fixture.name,universe:1,address:patch?.startAddress ?? 1}); }
function activateBlackout() { commitProjectChange("dmx-blackout",(draft)=>{draft.fixtures=blackout(draft.fixtures);}); status="Virtual blackout applied. Physical output remains disabled."; }
function applyPaletteToVirtualFixtures() { const rgb=hexToRgb(selected().hex); commitProjectChange("palette-to-fixtures",(draft)=>{draft.fixtures=draft.fixtures.map((fixture)=>({ ...fixture, properties:{ ...fixture.properties, red:rgb.r, green:rgb.g, blue:rgb.b } }));}); updateRendererFromFixtures(); status=`${selected().hex} applied to ${project.fixtures.length} virtual fixture(s).`; }
function createCueSnapshot() {
  try {
    const timing={};
    for (const key of ["duration","fade","delay"]) {
      const input=document.querySelector(`#cue-${key}`);
      if (!input.value.trim() || !input.checkValidity()) throw new Error(`${t(key)}: enter a valid value.`);
      timing[key]=Number(input.value);
    }
    let cue;
    commitProjectChange("cue-create",(draft)=>{cue=createCue(draft.fixtures,{name:`Look ${draft.cues.length+1}`,...timing});draft.cues=[...draft.cues,cue];});
    status=`${cue.name} captured with ${cue.targets.length} fixture target(s).`;
    render();
  } catch(error) { document.querySelector("#status").textContent=status=error.message; }
}
function updateRendererFromFixtures() { const fixture=project.fixtures[0]; if(fixture) renderer?.setAccent(rgbToHex({r:fixture.properties.red,g:fixture.properties.green,b:fixture.properties.blue})); renderer?.setFixtures(project.fixtures); }
function stopPlayback(message="Cue playback stopped.") { if(playbackTimer){clearInterval(playbackTimer);playbackTimer=null;} status=message; }
function playLatestCue() {
  const cue=project.cues.find((item)=>item.id===preferences.cueId) ?? project.cues.at(-1);
  if (!cue) return;
  stopPlayback();
  const source=structuredClone(project.fixtures),started=performance.now();
  playbackTimer=setInterval(()=>{
    const elapsed=(performance.now()-started)/1000;
    renderer?.setFixtures(evaluateCue(source,cue,elapsed));
    document.querySelector("#status").textContent=`Playing ${cue.name} · ${(Math.min(elapsed,cue.duration)).toFixed(1)}s / ${cue.duration}s`;
    if (elapsed>=cue.duration) { stopPlayback(`${cue.name} completed in virtual simulation.`); render(); }
  },100);
  render();
}
function downloadText(content, filename, type) { const file=new Blob([content],{type}); const link=document.createElement("a"); link.href=URL.createObjectURL(file); link.download=filename; link.click(); URL.revokeObjectURL(link.href); }
function exportFile(kind) { const stem=safeFileStem(project.name); const exports={ project:[projectJson(project),`${stem}.ald.json`,"application/json"], palette:[paletteJson(palette()),`${stem}-palette.json`,"application/json"], css:[paletteCss(palette()),`${stem}-palette.css`,"text/css"], patch:[patchCsv(project.fixtures),`${stem}-patch.csv`,"text/csv"], cues:[cueCsv(project.cues),`${stem}-cues.csv`,"text/csv"] }; const [content,name,type]=exports[kind]; downloadText(content,name,type); status=`${name} downloaded.`; document.querySelector("#status").textContent=status; }
async function importNativeProject(file) { const result=await readProjectFile(file); if(!result.valid) return setStatus(result.errors.join(" ")); project=result.project; undoStack=[];redoStack=[];saveProject();status=`${project.name} imported locally.`;render(); }
function savePreferences() { localStorage.setItem(preferencesKey, JSON.stringify(preferences)); }
function saveProject() { project.updatedAt = new Date().toISOString(); localStorage.setItem(storageKey, JSON.stringify(project)); status = t("statusSaved"); }
function commitProjectChange(label, mutate) { stopPlayback(); const next=commitTransaction({project,undoStack,redoStack},label,mutate); project=next.project;undoStack=next.undoStack;redoStack=next.redoStack;saveProject(); }
function mutateColours(fn) { commitProjectChange("palette-update",(draft)=>{draft.palettes[0].colors=fn(structuredClone(draft.palettes[0].colors));}); render(); }
function undo() { if (!undoStack.length) return setStatus(t("noUndo")); const next=undoTransaction({project,undoStack,redoStack});project=next.project;undoStack=next.undoStack;redoStack=next.redoStack;saveProject();status=t("statusUndo");render(); }
function redo() { if (!redoStack.length) return setStatus(t("noRedo")); const next=redoTransaction({project,undoStack,redoStack});project=next.project;undoStack=next.undoStack;redoStack=next.redoStack;saveProject();status=t("statusRedo");render(); }
function setStatus(value) { status = value; render(); }
function esc(value) { return String(value).replace(/[&<>"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"})[char]); }
function disabled(title) { return `disabled title="${esc(title)}"`; }
function compact(value, digits = 1) { return Number(value).toFixed(digits); }
function colourSpaceMarkup(hex) { const rgb=hexToRgb(hex),hsl=rgbToHsl(rgb),hsv=rgbToHsv(rgb),lab=rgbToLab(rgb),oklab=rgbToOklab(rgb); return `<section class="colour-space-card" aria-label="${t("colorSpaces")}"><h3>${t("colorSpaces")}</h3><dl><div><dt>sRGB</dt><dd>${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}</dd></div><div><dt>HSL</dt><dd>${compact(hsl.h)}° · ${compact(hsl.s*100)}% · ${compact(hsl.l*100)}%</dd></div><div><dt>HSV</dt><dd>${compact(hsv.h)}° · ${compact(hsv.s*100)}% · ${compact(hsv.v*100)}%</dd></div><div><dt>CIELAB</dt><dd>${compact(lab.l)}, ${compact(lab.a)}, ${compact(lab.b)}</dd></div><div><dt>OKLab</dt><dd>${compact(oklab.l,3)}, ${compact(oklab.a,3)}, ${compact(oklab.b,3)}</dd></div></dl><small class="${isSrgbGamut(rgb)?"pass":"fail"}">${isSrgbGamut(rgb)?t("inSrgb"):t("outsideSrgb")}</small></section>`; }
function fixtureLibraryMarkup() { return fixtureProfiles.map((profile)=>`<article><b>${esc(profile.model)}</b><small>${esc(profile.type)} · ${profile.modes[0].channels.length} CH</small><p>${esc(profile.validationStatus)} · ${esc(profile.provenance)}</p><button data-profile="${profile.id}">${t("addToVirtualPatch")}</button></article>`).join(""); }
function selectedFixture() { return project.fixtures.find((fixture)=>fixture.id===preferences.fixtureId) ?? project.fixtures[0]; }
function fixtureInspectorMarkup() { const fixture=selectedFixture(),profile=getFixtureProfile(fixture.profileId),patch=fixture.patchAssignment ?? {universe:1,startAddress:1}; return `<section class="fixture-inspector"><h3>${t("virtualFixture")}</h3><label>${t("fixtureLabel")}<select id="fixture-select">${project.fixtures.map((item)=>`<option value="${item.id}" ${item.id===fixture.id?"selected":""}>${esc(item.name)}</option>`).join("")}</select></label><small>${esc(profile.model)} · ${esc(profile.validationStatus)}</small><label>${t("colourName")}<input id="fixture-name" value="${esc(fixture.name)}" /></label><div class="fixture-grid"><label>${t("universe")}<input id="fixture-universe" type="number" min="1" value="${patch.universe}" /></label><label>${t("address")}<input id="fixture-address" type="number" min="1" max="512" value="${patch.startAddress}" /></label><label>${t("dimmer")}<input id="fixture-dimmer" type="number" min="0" max="255" value="${fixture.properties.dimmer ?? 0}" /></label><label>${t("beam")}<input id="fixture-beam" type="number" min="0" max="255" value="${fixture.properties.beam ?? 0}" /></label></div><button id="apply-fixture" class="wide">${t("applyFixturePatch")}</button></section>`; }
function applyFixtureInspector() {
  const fixture=selectedFixture();
  if (!fixture) return;
  const value=(id)=>{
    const input=document.querySelector(id);
    if (!input.value.trim() || !input.checkValidity()) throw new Error(`${input.closest("label").textContent.trim()}: enter a valid value.`);
    return Number(input.value);
  };
  try {
    const changes={
      name:document.querySelector("#fixture-name").value,
      properties:{dimmer:value("#fixture-dimmer"),beam:value("#fixture-beam")},
      universe:value("#fixture-universe"),startAddress:value("#fixture-address")
    };
    commitProjectChange("fixture-update",(draft)=>{draft.fixtures=updateFixture(draft.fixtures,fixture.id,changes);});
    updateRendererFromFixtures();
    status=phrase("fixtureUpdated",{name:selectedFixture().name});
    render();
  } catch(error) { document.querySelector("#status").textContent=status=error.message; }
}

function render() {
  renderer?.destroy(); renderer = null;
  document.documentElement.lang = preferences.locale;
  document.documentElement.dataset.theme = preferences.theme;
  const active = selected();
  const contrast = contrastResult(active.hex, "#0B1220");
  const colourSpaces = colourSpaceMarkup(active.hex);
  const nav = [
    ["canvas", "⌂", true], ["palette", "◉", true], ["light", "☼", true], ["copilot", "◌", true], ["library", "▱", true], ["export", "↗", true], ["community", "♧", false]
  ].map(([key, icon, enabled]) => `<button class="module ${preferences.module === key ? "is-active" : ""}" data-module="${key}" ${enabled ? "" : disabled(`${t(key)} ${t("availableLater")}`)}><span>${icon}</span>${t(key)}</button>`).join("");
  const tools = [["select","↖",true],["paletteBrush","◉",true],["fixture","☀",true],["material","◆",true],["shapes","□",false],["text","T",false],["measure","⌗",false],["orbit","◎",true],["aiPin","✦",false]].map(([key, icon, enabled]) => `<button class="tool ${preferences.tool === key ? "is-active" : ""}" data-tool="${key}" ${enabled ? "" : disabled(`${t(key)} ${t("availableLater")}`)}><span>${icon}</span>${t(key)}</button>`).join("");
  const swatches = palette().colors.map((swatch) => `<button class="swatch ${active.id === swatch.id ? "is-selected" : ""}" data-swatch="${swatch.id}" aria-label="${esc(swatch.name)} ${swatch.hex}"><span style="background:${swatch.hex}"></span><b>${esc(swatch.name)}</b><small>${swatch.hex}</small>${swatch.locked ? "<em>⌁</em>" : ""}</button>`).join("");
  const patchedFixtures = project.fixtures.filter((fixture) => fixture.patchAssignment);
  const virtualFrame = dmxFrame(project.fixtures);
  const activeCue=project.cues.find((cue)=>cue.id===preferences.cueId) ?? project.cues.at(-1);
  const cueBlocks = project.cues.map((cue) => `<button type="button" class="cue-block" data-cue="${esc(cue.id)}" aria-pressed="${cue.id===activeCue?.id}" style="--cue-width:${Math.max(55, cue.duration * 25)}px">${esc(cue.name)} · ${cue.duration}s</button>`).join("") || `<small class="empty-cues">${t("noCues")}</small>`;
  app.innerHTML = `
    <header class="topbar">
      <div class="brand-lockup" aria-label="${t("brandAlt")}">
        <img class="corporate-mark" src="https://raw.githubusercontent.com/HephzibahBehulahHQ/hb-design-system/main/assets/corporate/hephzibah-behulah-official.jpg" alt="Hephzibah Behulah" onerror="this.hidden=true;this.nextElementSibling.hidden=false" />
        <span class="brand-fallback" hidden>HB <b>Hephzibah Behulah</b></span><span class="brand-divider"></span><span class="division">⚡ HB Elektroniker</span>
      </div>
      <div class="product-lockup"><strong>Adigun<span>Light</span>Design</strong><small>Unified Color &amp; Light Design Studio</small></div>
      <div class="utility-controls"><label class="language"><span>◎</span><select id="locale" aria-label="${t("language")}">${supportedLocales.map((locale) => `<option value="${locale}" ${locale === preferences.locale ? "selected" : ""}>${locale.toUpperCase()}</option>`).join("")}</select></label><button id="theme" class="icon-button" title="${t("appearance")}" aria-label="${t("appearance")}">${preferences.theme === "dark" ? "☼" : "◐"}</button><span class="offline-pill" title="${t("offline")}">● ${t("offline")}</span></div>
    </header>
    <nav class="module-nav" aria-label="${t("appModules")}">${nav}</nav>
    <main id="workspace" class="editor-layout">
      <aside class="left-rail panel">
        <section class="project-heading"><div><small>${t("project")}</small><input id="project-name" value="${esc(project.name)}" aria-label="${t("project")} name" /></div><span class="save-state">● ${t("saved")}</span></section>
        <section><h2>▰ ${t("layers")}</h2><ul class="layer-list"><li>⌄ ▣ ${t("layersLighting")} <span>◉</span></li><li>⌄ ▣ ${t("layersPalette")} <span>◉</span></li><li>⌄ ▣ ${t("layersScene")} <span>◉</span></li></ul></section>
        <section class="tool-section"><h2>☼ ${t("tools")}</h2><div class="tool-list">${tools}</div></section>
      </aside>
      <section class="work-area">
        <div class="workspace-tabs panel"><button class="tab ${preferences.view === "palette" ? "is-active" : ""}" data-view="palette">2D ${t("palette")}</button><button class="tab ${preferences.view === "light" ? "is-active" : ""}" data-view="light">3D ${t("light")}</button><span></span><button class="view-menu" ${preferences.view === "light" ? "" : disabled(t("select3d"))}>${t("perspective")}⌄</button></div>
        ${preferences.view === "light" ? `<div class="scene-preview light-canvas panel"><div class="scene-title"><b>3D ${t("light")}</b><small>${t("webglPreview")} · M3</small></div><canvas id="light-canvas" tabindex="0" aria-label="${t("previewLabel")}"></canvas><div class="canvas-actions"><button id="apply-scene">${t("apply")} ${t("selectedColour")}</button><button id="reset-camera">${t("resetCamera")}</button></div></div>` : `<div class="scene-preview panel" role="img" aria-label="${t("scenePreview")}"><div class="scene-title"><b>${t("scenePreview")}</b><small>${t("sceneNote")}</small></div><div class="beam beam-blue"></div><div class="beam beam-amber"></div><div class="beam beam-magenta"></div><div class="stage-truss"></div><div class="scene-wall"><div class="art-frame"></div><div class="couch"></div><div class="plant plant-left"></div><div class="plant plant-right"></div><div class="lamp"></div></div><div class="axis"><i>X</i><b>Y</b><em>Z</em></div></div>`}
        <div class="lower-workspace"><section class="palette-panel panel"><div class="section-title"><h2>◉ ${t("activePalette")} — ${esc(palette().name)}</h2><button id="copy-css" class="subtle" title="${t("exportCss")}">▣</button></div><div class="swatches">${swatches}</div><div class="palette-actions"><input id="seed" value="${preferences.seed}" aria-label="Seed colour" maxlength="7" /><select id="harmony" aria-label="${t("harmony")}">${["analogous","complementary","splitComplementary","triadic","tetradic","square","monochromatic"].map((type) => `<option value="${type}" ${type === preferences.harmony ? "selected" : ""}>${type}</option>`).join("")}</select><button id="reroll">⟳ ${t("reroll")}</button><button id="add-colour">＋ ${t("add")}</button></div></section>
          <section class="timeline panel"><div class="section-title"><h2>◌ ${t("timeline")}</h2><span class="m-badge">M5 · ${t("simulationOnly")}</span></div><p>${project.fixtures.length ? `${t("universe")} 1 · ${patchedFixtures.length}/${project.fixtures.length} ${t("fixturesPatched")} · 1–${Math.max(0,...patchedFixtures.map((fixture)=>fixture.patchAssignment.startAddress+fixture.patchAssignment.channelFootprint-1))} ${t("activeChannels")}.` : t("noFixtures")}</p><div class="dmx-actions"><button id="add-fixture">＋ ${t("addWash")}</button><button id="apply-fixture-colour" ${project.fixtures.length ? "" : "disabled"}>${t("applySwatch")}</button><button id="create-cue" ${project.fixtures.length ? "" : "disabled"}>＋ ${t("captureCue")}</button><button id="play-cue" ${project.cues.length ? "" : "disabled"}>▶ ${t("play")}</button><button id="stop-cue" ${playbackTimer ? "" : "disabled"}>■ ${t("stop")}</button><span>CH 1: ${virtualFrame[0]} · ${t("outputDisabled")}</span></div><div class="cue-track" aria-label="${t("timeline")}">${cueBlocks}</div></section></div>
      </section>
      <aside class="inspector panel"><div class="section-title"><h2>◈ ${t("inspector")}</h2><button class="subtle" disabled title="Inspector follows the selected palette swatch">×</button></div><div class="inspector-tabs"><button class="is-active">${t("palette")}</button><button disabled>Light</button><button disabled>DMX</button><button disabled>Effects</button></div><div class="selected-preview" style="--selected:${active.hex}"></div><label>${t("colourName")}<input id="swatch-name" value="${esc(active.name)}" /></label><label>${t("hex")}<div class="input-row"><input id="swatch-hex" value="${active.hex}" spellcheck="false" /><button id="apply-colour">${t("apply")}</button></div></label><button id="lock-swatch" class="wide">${active.locked ? "⌁ " + t("unlock") : "⌁ " + t("lock")}</button><section class="contrast-card"><h3>${t("contrast")}</h3><b>${contrast.ratio.toFixed(2)} : 1</b><span class="${contrast.aa ? "pass" : "fail"}">AA ${contrast.aa ? "pass" : "review"}</span><small>Against Midnight Navy #0B1220</small></section></aside>
      <aside class="lux-panel panel ${preferences.luxOpen ? "" : "is-collapsed"}"><div class="lux-heading"><div><span class="lux-icon">✦</span><h2>Lux <small>— AI Co-Pilot</small></h2></div><button id="toggle-lux" class="subtle" aria-label="${preferences.luxOpen ? t("closePanel") : t("openLux")}">${preferences.luxOpen ? "×" : "✦"}</button></div>${preferences.luxOpen ? `<p class="lux-subtitle">Your color &amp; light design assistant</p><div class="lux-message"><b>Lux · ${t("offline")}</b><p>${t("luxUnavailable")}</p><ul><li>Palette and project context are kept local.</li><li>No project data is sent anywhere.</li></ul></div><form id="lux-form" class="lux-input"><input id="lux-question" placeholder="Ask Lux anything…" aria-label="Ask Lux" /><button>➤</button></form>` : ""}</aside>
    </main>
    ${preferences.module === "export" ? `<section class="export-drawer panel" aria-label="${t("export")}"><div class="section-title"><h2>↗ ${t("export")}</h2><button id="close-exports" class="subtle">×</button></div><p>Verified local formats only. Advanced interchange formats remain unavailable until independently validated.</p><div class="export-grid"><button data-export="project">Project JSON</button><button data-export="palette">Palette JSON</button><button data-export="css">CSS variables</button><button data-export="patch">Patch CSV</button><button data-export="cues">Cue CSV</button><button id="import-project">Import project JSON</button><input id="project-file" type="file" accept="application/json,.json" hidden /></div></section>` : ""}
    <footer><span>${t("footer")}</span><span id="status" role="status" aria-live="polite">${status}</span><div><button id="save">${t("save")}</button><button id="undo" ${undoStack.length ? "" : "disabled"}>↶ ${t("undo")}</button><button id="redo" ${redoStack.length ? "" : "disabled"}>↷ ${t("redo")}</button></div></footer>`;
  document.querySelector(".contrast-card").insertAdjacentHTML("beforebegin", colourSpaces);
  if (preferences.view === "light" && project.fixtures.length) document.querySelector(".selected-preview").insertAdjacentHTML("afterend", fixtureInspectorMarkup());
  if (preferences.module === "library") { const drawer=document.createElement("section"); drawer.className="library-drawer panel"; drawer.setAttribute("aria-label",t("library")); drawer.innerHTML=`<div class="section-title"><h2>▱ ${t("library")}</h2><button id="close-library" class="subtle" aria-label="${t("close")}">×</button></div><p>${t("virtualLibraryNote")}</p><div class="fixture-library">${fixtureLibraryMarkup()}</div>`; app.insertBefore(drawer,app.querySelector("footer")); }
  document.querySelector(".cue-track").insertAdjacentHTML("beforebegin", `<div class="cue-timing">${["duration","fade","delay"].map((key)=>`<label>${t(key)} (s)<input id="cue-${key}" type="number" required min="${key === "duration" ? ".1" : "0"}" step=".1" value="${key === "duration" ? "5" : key === "fade" ? "1" : "0"}" /></label>`).join("")}</div>`);
  if (activeCue) document.querySelector(".cue-track").insertAdjacentHTML("beforebegin", `<div class="cue-timing"><label>${t("timeline")}<input id="edit-cue-name" value="${esc(activeCue.name)}" /></label>${["duration","fade","delay"].map((key)=>`<label>${t(key)} (s)<input id="edit-cue-${key}" type="number" required min="0" step=".1" value="${activeCue[key] ?? 0}" /></label>`).join("")}<button id="edit-cue">${t("apply")}</button></div>`);
  bind();
  if (preferences.view === "light") renderer = createLightLabRenderer(document.querySelector("#light-canvas"), { accent:scene().materialColor, fixtures:project.fixtures });
}

function bind() {
  const editButton=document.querySelector("#edit-cue");
  if (editButton) editButton.onclick=()=>{
    try {
      const changes={name:document.querySelector("#edit-cue-name").value};
      for (const key of ["duration","fade","delay"]) {
        const input=document.querySelector(`#edit-cue-${key}`);
        if (!input.value.trim() || !input.checkValidity()) throw new Error(`${t(key)}: enter a valid value.`);
        changes[key]=Number(input.value);
      }
      const cue=project.cues.find((item)=>item.id===preferences.cueId) ?? project.cues.at(-1);
      commitProjectChange("cue-edit",(draft)=>{draft.cues=draft.cues.map((item)=>item.id===cue.id ? editCue(item,changes) : item);});
      render();
    } catch(error) { document.querySelector("#status").textContent=status=error.message; }
  };
  document.querySelectorAll("[data-cue]").forEach((button)=>button.onclick=()=>{
    stopPlayback();
    preferences.cueId=button.dataset.cue;
    savePreferences();
    render();
  });
  document.querySelector("#locale").onchange = (event) => { preferences.locale = event.target.value; savePreferences(); status = t("statusLocale"); render(); };
  document.querySelector("#theme").onclick = () => { preferences.theme = preferences.theme === "dark" ? "light" : "dark"; savePreferences(); status = t("statusTheme"); render(); };
  document.querySelectorAll("[data-module]").forEach((button) => button.onclick = () => { const key = button.dataset.module; if (key === "copilot") preferences.luxOpen = true; else preferences.module = key; status = t("statusModule") + button.textContent.trim(); render(); });
  document.querySelectorAll("[data-view]").forEach((button) => button.onclick = () => { preferences.view = button.dataset.view; savePreferences(); render(); });
  document.querySelectorAll("[data-tool]").forEach((button) => button.onclick = () => { preferences.tool = button.dataset.tool; status = t("statusTool") + button.textContent.trim(); render(); });
  document.querySelectorAll("[data-swatch]").forEach((button) => button.onclick = () => { preferences.selected = button.dataset.swatch; render(); });
  document.querySelector("#project-name").onchange = (event) => { const name=event.target.value.trim(); if(name&&name!==project.name) commitProjectChange("project-rename",(draft)=>{draft.name=name;}); render(); };
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
  const applyScene = document.querySelector("#apply-scene"); if (applyScene) applyScene.onclick = () => { commitProjectChange("scene-material",(draft)=>{if(!draft.scenes[0])draft.scenes.push({id:"studio-room",name:"Studio room",materialColor:selected().hex});else draft.scenes[0].materialColor=selected().hex;}); renderer.setAccent(selected().hex); status = `${t("apply")} ${selected().hex}`; document.querySelector("#status").textContent = status; };
  const resetCamera = document.querySelector("#reset-camera"); if (resetCamera) resetCamera.onclick = () => renderer.reset();
  document.querySelector("#add-fixture").onclick = () => { addVirtualFixture(); render(); };
  const blackoutButton = document.querySelector("#blackout"); if (blackoutButton) blackoutButton.onclick = () => { activateBlackout(); render(); };
  document.querySelector("#apply-fixture-colour").onclick = () => { applyPaletteToVirtualFixtures(); render(); };
  document.querySelector("#create-cue").onclick = createCueSnapshot;
  document.querySelector("#play-cue").onclick = playLatestCue;
  document.querySelector("#stop-cue").onclick = () => { stopPlayback(); render(); };
  document.querySelectorAll("[data-export]").forEach((button) => button.onclick = () => exportFile(button.dataset.export));
  const closeExports = document.querySelector("#close-exports"); if (closeExports) closeExports.onclick = () => { preferences.module="canvas"; render(); };
  const importButton=document.querySelector("#import-project"), projectFile=document.querySelector("#project-file"); if(importButton&&projectFile){importButton.onclick=()=>projectFile.click();projectFile.onchange=()=>{const [file]=projectFile.files;if(file) importNativeProject(file);};}
  document.querySelectorAll("[data-profile]").forEach((button)=>button.onclick=()=>{addVirtualFixture(button.dataset.profile);render();});
  const closeLibrary=document.querySelector("#close-library"); if(closeLibrary) closeLibrary.onclick=()=>{preferences.module="canvas";render();};
  const fixtureSelect=document.querySelector("#fixture-select"); if(fixtureSelect) fixtureSelect.onchange=()=>{preferences.fixtureId=fixtureSelect.value;savePreferences();render();};
  const applyFixture=document.querySelector("#apply-fixture"); if(applyFixture) applyFixture.onclick=applyFixtureInspector;
  const form = document.querySelector("#lux-form"); if (form) form.onsubmit = (event) => { event.preventDefault(); setStatus(t("luxUnavailable")); };
}
function downloadCss() { const file = new Blob([paletteCssVariables(palette().colors)], { type:"text/css" }); const link = document.createElement("a"); link.href = URL.createObjectURL(file); link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-palette.css`; link.click(); URL.revokeObjectURL(link.href); setStatus(t("statusExport")); }
window.addEventListener("keydown", (event) => { if (isEditableTarget(event.target)) return; const shortcut=editorShortcut(event); if (!shortcut) return; event.preventDefault(); if (shortcut === "save") { saveProject(); render(); } else if (shortcut === "undo") undo(); else redo(); });
render();
