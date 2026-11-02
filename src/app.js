import { validateProject } from "./domain/project.js";
import { prepareEditorProject } from "./domain/editor-project.js";
import { moveSwatch, removeSwatch, reorderSwatch } from "./domain/palette-store.js";
import { readImagePalette } from "./domain/image-file.js";
import { customHueHarmony,perceptualScale } from "./domain/color-engine.js";
import { compositeSwatch,swatchCssColor } from "./domain/swatch-opacity.js";
import { snapshotPalette, restorePalette, comparePalettes } from "./domain/palette-versions.js";
import { paletteRaster } from "./export/raster.js";
import { hslToRgb } from "./domain/color-engine.js";
import { suggestContrast } from "./domain/color-engine.js";
import { mapOklchToSrgb, oklabToOklch } from "./domain/color-engine.js";
import { createStudioMoodProject } from "./domain/studio-mood.js";
import { contrastResult, hexToRgb, isSrgbGamut, normalizeHex, rgbToHex, rgbToHsl, rgbToHsv, rgbToLab, rgbToOklab } from "./domain/color-engine.js";
import { paletteCssVariables, rerollUnlocked, starterPalette, updateSwatch } from "./domain/palette-store.js";
import { supportedLocales, translate } from "./i18n.js";
import { createLightLabRenderer } from "./light-lab/renderer.js";
import { blackout, createFixture, dmxFrame, fixtureProfiles, getFixtureProfile, patchFixture, updateFixture } from "./dmx/engine.js";
import { createCue, editCue, evaluateCue, evaluateSequence, moveCue } from "./timeline/engine.js";
import { cueCsv, designTokenJson, paletteCss, paletteJson, paletteSvg, patchCsv, projectJson, safeFileStem } from "./export/formats.js";
import { readProjectFile } from "./domain/import-project.js";
import { editorShortcut, isEditableTarget } from "./accessibility/shortcuts.js";
import { commitTransaction, redoTransaction, undoTransaction } from "./domain/history.js";

const storageKey = "adigunlightdesign/project-v1";
const preferencesKey = "adigunlightdesign/preferences-v1";
const app = document.querySelector("#app");
const defaults = { locale:"en", theme:"dark", module:"canvas", view:"light", tool:"select", selected:"deep-blue", luxOpen:true, harmony:"analogous", seed:"#2196F3" };
const preferences = { ...defaults, ...safeParse(localStorage.getItem(preferencesKey)) };
let project = loadProject();
let undoStack = [], redoStack = [], status = "", renderer = null, playbackTimer = null;

function safeParse(value) { try { return JSON.parse(value) ?? {}; } catch { return {}; } }
function loadProject() {
  const loaded = safeParse(localStorage.getItem(storageKey));
  if (validateProject(loaded).valid) return prepareEditorProject(loaded);
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
function playSequence() {
  if (!project.cues.length) return;
  stopPlayback();
  const source=structuredClone(project.fixtures),cues=structuredClone(project.cues),started=performance.now();
  preferences.view="light";
  playbackTimer=setInterval(()=>{
    const frame=evaluateSequence(source,cues,(performance.now()-started)/1000);
    renderer?.setFixtures(frame.fixtures);
    document.querySelector("#status").textContent=`${t("playSequence")} · ${frame.index + 1}/${cues.length}`;
    if (frame.complete) { stopPlayback(); render(); }
  },100);
  render();
}
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
async function importNativeProject(file) { const result=await readProjectFile(file); if(!result.valid) return setStatus(result.errors.join(" ")); stopPlayback(); project=prepareEditorProject(result.project); undoStack=[];redoStack=[];saveProject();status=`${project.name} imported locally.`;render(); }
function savePreferences() { localStorage.setItem(preferencesKey, JSON.stringify(preferences)); }
function saveProject() { project.updatedAt = new Date().toISOString(); localStorage.setItem(storageKey, JSON.stringify(project)); status = t("statusSaved"); }
function commitProjectChange(label, mutate) { stopPlayback(); const next=commitTransaction({project,undoStack,redoStack},label,mutate); project=next.project;undoStack=next.undoStack;redoStack=next.redoStack;saveProject(); }
function mutateColours(fn) { commitProjectChange("palette-update",(draft)=>{draft.palettes[0].colors=fn(structuredClone(draft.palettes[0].colors));}); render(); }
function undo() { if (!undoStack.length) return setStatus(t("noUndo")); stopPlayback(); const next=undoTransaction({project,undoStack,redoStack});project=next.project;undoStack=next.undoStack;redoStack=next.redoStack;saveProject();status=t("statusUndo");render(); }
function redo() { if (!redoStack.length) return setStatus(t("noRedo")); stopPlayback(); const next=redoTransaction({project,undoStack,redoStack});project=next.project;undoStack=next.undoStack;redoStack=next.redoStack;saveProject();status=t("statusRedo");render(); }
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
      transform:Object.fromEntries(["x","y","z"].map((axis)=>[axis,value(`#fixture-${axis}`)])),
      properties:{dimmer:value("#fixture-dimmer"),beam:value("#fixture-beam"),...(()=>{
        const rgb=hexToRgb(document.querySelector("#fixture-colour").value);
        const white=document.querySelector("#fixture-white");
        const aiming=Object.fromEntries(["pan","tilt"].filter((key)=>document.querySelector(`#fixture-${key}`)).map((key)=>[key,value(`#fixture-${key}`)]));
        return {red:rgb.r,green:rgb.g,blue:rgb.b,...aiming,...(white ? {white:value("#fixture-white")} : {})};
      })()},
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
  const contrastBackground=normalizeHex(preferences.contrastBackground) ?? "#0B1220";
  const contrast = contrastResult(compositeSwatch(active,contrastBackground), contrastBackground);
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
  document.querySelector(".dmx-actions").insertAdjacentHTML("beforeend", `<button id="blackout" ${project.fixtures.length ? "" : "disabled"}>${t("blackout")}</button>`);
  document.querySelector(".dmx-actions").insertAdjacentHTML("beforeend", `<button id="play-sequence" ${project.cues.length ? "" : "disabled"}>▶ ${t("playSequence")}</button>`);
  if (activeCue) {
    const index=project.cues.indexOf(activeCue);
    document.querySelector("#edit-cue").insertAdjacentHTML("afterend", `<button data-move-cue="-1" ${index === 0 ? "disabled" : ""}>← ${t("earlier")}</button><button data-move-cue="1" ${index === project.cues.length - 1 ? "disabled" : ""}>${t("later")} →</button>`);
  }
  if (document.querySelector(".fixture-inspector")) {
    const properties=selectedFixture().properties;
    const color=rgbToHex({r:properties.red ?? 0,g:properties.green ?? 0,b:properties.blue ?? 0});
    document.querySelector("#apply-fixture").insertAdjacentHTML("beforebegin", `<label>${t("selectedColour")}<input id="fixture-colour" type="color" value="${color}" /></label>`);
    const fixture=selectedFixture(),profile=getFixtureProfile(fixture.profileId);
    document.querySelector("#apply-fixture").insertAdjacentHTML("beforebegin", `<div class="fixture-grid">${["x","y","z"].map((axis)=>`<label>${axis.toUpperCase()} (m)<input id="fixture-${axis}" type="number" required step="any" value="${fixture.transform?.[axis] ?? 0}" /></label>`).join("")}</div>`);
    const mode=profile.modes.find((item)=>item.id===fixture.modeId);
    for (const key of ["pan","tilt"]) if (mode?.channels.includes(key)) document.querySelector("#apply-fixture").insertAdjacentHTML("beforebegin", `<label>${t(key)} (0–255)<input id="fixture-${key}" type="number" required min="0" max="255" step="1" value="${properties[key] ?? 127}" /></label>`);
    if (mode?.channels.includes("white")) document.querySelector("#apply-fixture").insertAdjacentHTML("beforebegin", `<label>${t("whiteChannel")}<input id="fixture-white" type="number" required min="0" max="255" step="1" value="${properties.white ?? 0}" /></label>`);
  }
  for (const id of ["fixture-dimmer","fixture-beam"]) {
    const input=document.querySelector(`#${id}`);
    if (!input) continue;
    input.type="range";
    input.step="1";
    const output=document.createElement("output");
    output.htmlFor=id;
    output.id=`${id}-value`;
    const update=()=>{
      output.textContent=id === "fixture-dimmer" ? `${Math.round(Number(input.value) / 255 * 100)}%` : `${input.value} / 255`;
      input.setAttribute("aria-valuetext",output.textContent);
    };
    input.insertAdjacentElement("afterend",output);
    input.oninput=update;
    update();
  }
  if (project.fixtures.length) document.querySelector(".layer-list").insertAdjacentHTML("afterend", `<ul class="fixture-layer-list" aria-label="${t("layersLighting")}">${project.fixtures.map((fixture)=>`<li><button data-layer-fixture="${esc(fixture.id)}" aria-pressed="${fixture.id===selectedFixture()?.id}"><span>☼</span> ${esc(fixture.name)}</button></li>`).join("")}</ul>`);
  document.querySelector(".export-grid")?.insertAdjacentHTML("beforeend", `<button id="export-svg">SVG</button><button id="export-tokens">${t("designTokens")}</button>`);
  document.querySelector(".palette-actions").insertAdjacentHTML("beforeend", `<button id="extract-image">${t("extractImage")}</button><input id="palette-image" type="file" accept="image/png,image/jpeg,image/webp" hidden />`);
  const swatchIndex=palette().colors.indexOf(active);
  document.querySelector("#lock-swatch").insertAdjacentHTML("afterend", `<div class="palette-actions"><button data-move-swatch="-1" ${swatchIndex===0 ? "disabled" : ""}>← ${t("earlier")}</button><button data-move-swatch="1" ${swatchIndex===palette().colors.length-1 ? "disabled" : ""}>${t("later")} →</button><button id="remove-swatch" ${palette().colors.length<2 ? "disabled" : ""}>${t("removeColor")}</button></div>`);
  document.querySelector("#apply-colour").insertAdjacentHTML("afterend", `<button id="copy-hex">${t("copy")}</button>`);
  const hsl=rgbToHsl(hexToRgb(active.hex));
  document.querySelector("#lock-swatch").insertAdjacentHTML("beforebegin", `<section class="colour-space-card">${[["hue",hsl.h,360],["saturation",hsl.s*100,100],["lightness",hsl.l*100,100]].map(([key,value,max])=>`<label>${t(key)}<input id="color-${key}" type="number" min="0" max="${max}" step="any" value="${compact(value,2)}" /></label>`).join("")}<button id="apply-hsl" class="wide">${t("apply")} HSL</button></section>`);
  document.querySelector(".export-grid")?.insertAdjacentHTML("beforeend", `<button data-raster="image/png">PNG</button><button data-raster="image/jpeg">JPEG</button>`);
  const contrastCard=document.querySelector(".contrast-card");
  contrastCard.querySelector("small").textContent=contrastBackground;
  contrastCard.insertAdjacentHTML("beforeend", `<label>${t("contrastBackground")}<input id="contrast-background" type="color" value="${contrastBackground}" /></label><dl>${[["normalText","AA",contrast.aa],["normalText","AAA",contrast.aaa],["largeText","AA",contrast.largeAa],["largeText","AAA",contrast.largeAaa]].map(([key,level,pass])=>`<div><dt>${t(key)} ${level}</dt><dd class="${pass ? "pass" : "fail"}">${t(pass ? "passes" : "fails")}</dd></div>`).join("")}</dl>`);
  const contrastSuggestion=contrast.aa || (active.opacity ?? 1)<1 ? null : suggestContrast(active.hex,contrastBackground);
  if (contrastSuggestion) contrastCard.insertAdjacentHTML("beforeend", `<button id="apply-contrast" class="wide">${t("improveContrast")} ${contrastSuggestion}</button>`);
  const oklch=oklabToOklch(rgbToOklab(hexToRgb(active.hex)));
  document.querySelector("#lock-swatch").insertAdjacentHTML("beforebegin", `<section class="colour-space-card"><h3>OKLCH</h3>${[["l",oklch.l,1,t("lightness")],["c",oklch.c,1,t("chroma")],["h",oklch.h,360,t("hue")]].map(([key,value,max,label])=>`<label>${label} (0–${max})<input id="oklch-${key}" type="number" required min="0" max="${max}" step="any" value="${compact(value,4)}" /></label>`).join("")}<button id="apply-oklch" class="wide">${t("apply")} OKLCH</button></section>`);
  document.querySelector("#oklch-l").closest("label").firstChild.textContent="L (0–1)";
  document.querySelector(".palette-panel").insertAdjacentHTML("beforeend", `<div class="palette-actions"><button id="save-version">${t("saveVersion")}</button><select id="palette-version" aria-label="${t("savedVersions")}">${project.palettes.slice(1).map((item)=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("")}</select><button id="restore-version" ${project.palettes.length<2 ? "disabled" : ""}>${t("restoreVersion")}</button></div>`);
  if (project.palettes.length>1) document.querySelector(".palette-panel").insertAdjacentHTML("beforeend", `<details class="palette-comparison"><summary>${t("compareVersions")}</summary><div id="version-comparison"></div></details>`);
  document.querySelector("#lock-swatch").insertAdjacentHTML("beforebegin", `<label>${t("opacity")} (%)<input id="swatch-opacity" type="number" required min="0" max="100" step="any" value="${(active.opacity ?? 1)*100}" /></label><button id="apply-opacity" class="wide">${t("apply")}</button>`);
  for (const button of document.querySelectorAll("[data-swatch]")) {
    const swatch=palette().colors.find((item)=>item.id===button.dataset.swatch);
    button.querySelector("span").style.background=swatchCssColor(swatch);
  }
  document.querySelector(".selected-preview").style.background=swatchCssColor(active);
  document.querySelector(".palette-panel").insertAdjacentHTML("beforeend", `<div class="palette-actions"><label>${t("hueSpacing")}<input id="custom-spacing" type="number" min="-360" max="360" step="any" value="30" /></label><button id="custom-hues">${t("customHues")}</button><button id="perceptual-scale">${t("perceptualScale")}</button></div>`);
  bind();
  if (preferences.view === "light") {
    renderer=createLightLabRenderer(document.querySelector("#light-canvas"), {accent:scene().materialColor,fixtures:project.fixtures.map((fixture)=>({...fixture,selected:fixture.id===selectedFixture()?.id}))});
    if (!renderer.supported) {
      const note=document.createElement("p");
      note.className="webgl-unavailable";
      note.setAttribute("role","status");
      note.textContent=t("webglUnavailable");
      document.querySelector("#light-canvas").replaceWith(note);
      document.querySelector("#reset-camera").disabled=true;
    }
  }
}

function bind() {
  const applyGenerated=(generator)=>{
    try {
      const generated=generator();
      mutateColours((colors)=>colors.map((color,index)=>color.locked ? color : {...color,hex:generated[index%generated.length]}));
    } catch(error) { document.querySelector("#status").textContent=status=error.message; }
  };
  document.querySelector("#custom-hues").onclick=()=>applyGenerated(()=>{
    const input=document.querySelector("#custom-spacing");
    if (!input.value.trim() || !input.checkValidity()) throw new Error("Enter valid hue spacing.");
    return customHueHarmony(preferences.seed,Number(input.value),Math.min(32,palette().colors.length));
  });
  document.querySelector("#perceptual-scale").onclick=()=>applyGenerated(()=>perceptualScale(preferences.seed,Math.max(2,Math.min(32,palette().colors.length))));
  document.querySelector("#apply-opacity").onclick=()=>{
    const input=document.querySelector("#swatch-opacity");
    if (!input.value.trim() || !input.checkValidity()) return input.reportValidity();
    mutateColours((colors)=>updateSwatch(colors,selected().id,{opacity:Number(input.value)/100}));
  };
  const comparison=document.querySelector("#version-comparison");
  if (comparison) {
    const updateComparison=()=>{
      const saved=project.palettes.find((item)=>item.id===document.querySelector("#palette-version").value);
      if (!saved) return;
      const cell=(color)=>color ? `<span style="background:${swatchCssColor(color)};display:inline-block;width:12px;height:12px"></span> ${esc(color.name)} ${swatchCssColor(color)}` : "—";
      comparison.innerHTML=`<table><thead><tr><th>${t("currentVersion")}</th><th>${t("savedVersions")}</th></tr></thead><tbody>${comparePalettes(palette(),saved).map((row)=>`<tr class="${row.changed ? "is-changed" : ""}"><td>${cell(row.current)}</td><td>${cell(row.saved)}</td></tr>`).join("")}</tbody></table>`;
    };
    document.querySelector("#palette-version").onchange=updateComparison;
    updateComparison();
  }
  document.querySelector("#save-version").onclick=()=>{
    commitProjectChange("palette-version-save",(draft)=>{draft.palettes.push(snapshotPalette(draft.palettes[0],`${draft.palettes[0].name} · ${draft.palettes.length}`));});
    render();
  };
  document.querySelector("#restore-version").onclick=()=>{
    const id=document.querySelector("#palette-version").value;
    const snapshot=project.palettes.find((item,index)=>index>0 && item.id===id);
    if (!snapshot) return;
    commitProjectChange("palette-version-restore",(draft)=>{draft.palettes[0]=restorePalette(draft.palettes[0],snapshot);});
    render();
  };
  document.querySelector("#apply-oklch").onclick=()=>{
    try {
      const values=Object.fromEntries(["l","c","h"].map((key)=>{
        const input=document.querySelector(`#oklch-${key}`);
        if (!input.value.trim() || !input.checkValidity()) throw new Error("Enter valid OKLCH values.");
        return [key,Number(input.value)];
      }));
      const result=mapOklchToSrgb(values);
      mutateColours((colors)=>updateSwatch(colors,selected().id,{hex:result.hex}));
      if (result.mapped) document.querySelector("#status").textContent=status=`${t("chromaMapped")} ${result.chroma.toFixed(4)}`;
    } catch(error) { document.querySelector("#status").textContent=status=error.message; }
  };
  const contrastButton=document.querySelector("#apply-contrast");
  if (contrastButton) contrastButton.onclick=()=>{
    const background=normalizeHex(preferences.contrastBackground) ?? "#0B1220";
    const hex=suggestContrast(selected().hex,background);
    if (hex) mutateColours((colors)=>updateSwatch(colors,selected().id,{hex}));
  };
  document.querySelector("#contrast-background").onchange=(event)=>{preferences.contrastBackground=event.target.value;savePreferences();render();};
  document.querySelectorAll("[data-raster]").forEach((button)=>button.onclick=async()=>{
    button.disabled=true;
    try {
      const blob=await paletteRaster(structuredClone(palette()),button.dataset.raster);
      const url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download=`${safeFileStem(project.name)}-palette.${button.dataset.raster==="image/png" ? "png" : "jpg"}`;
      link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(error) { document.querySelector("#status").textContent=status=error.message; }
    finally { button.disabled=false; }
  });
  document.querySelector("#apply-hsl").onclick=()=>{
    try {
      const values=["hue","saturation","lightness"].map((key)=>{
        const input=document.querySelector(`#color-${key}`);
        if (!input.value.trim() || !input.checkValidity()) throw new Error(`${t(key)}: enter a valid value.`);
        return Number(input.value);
      });
      const hex=rgbToHex(hslToRgb({h:values[0],s:values[1]/100,l:values[2]/100}));
      mutateColours((colors)=>updateSwatch(colors,selected().id,{hex}));
    } catch(error) { document.querySelector("#status").textContent=status=error.message; }
  };
  document.querySelector("#copy-hex").onclick=async()=>{
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard is unavailable in this browser.");
      await navigator.clipboard.writeText(swatchCssColor(selected()));
      document.querySelector("#status").textContent=status=t("copied");
    } catch(error) { document.querySelector("#status").textContent=status=error.message; }
  };
  document.querySelectorAll("[data-swatch]").forEach((button)=>{
    button.draggable=true;
    button.ondragstart=(event)=>{event.dataTransfer.setData("application/x-adigun-swatch",button.dataset.swatch);event.dataTransfer.effectAllowed="move";};
    button.ondragover=(event)=>{if([...event.dataTransfer.types].includes("application/x-adigun-swatch")){event.preventDefault();event.dataTransfer.dropEffect="move";}};
    button.ondrop=(event)=>{
      const sourceId=event.dataTransfer.getData("application/x-adigun-swatch"),targetId=button.dataset.swatch;
      if (!sourceId || sourceId===targetId || !palette().colors.some((color)=>color.id===sourceId)) return;
      event.preventDefault();
      mutateColours((colors)=>reorderSwatch(colors,sourceId,targetId));
    };
  });
  document.querySelector("#remove-swatch").onclick=()=>mutateColours((colors)=>removeSwatch(colors,selected().id));
  document.querySelectorAll("[data-move-swatch]").forEach((button)=>button.onclick=()=>mutateColours((colors)=>moveSwatch(colors,selected().id,Number(button.dataset.moveSwatch))));
  document.querySelector("#extract-image").onclick=()=>document.querySelector("#palette-image").click();
  document.querySelector("#palette-image").onchange=async(event)=>{
    const [file]=event.target.files;
    if (!file) return;
    const projectId=project.id;
    try {
      const colors=await readImagePalette(file);
      if (project.id!==projectId) return;
      mutateColours((existing)=>[...existing,...colors.map((color)=>({id:crypto.randomUUID(),name:color.hex,hex:color.hex,locked:false}))]);
    } catch(error) { document.querySelector("#status").textContent=status=error.message; }
  };
  const tokenButton=document.querySelector("#export-tokens");
  if (tokenButton) tokenButton.onclick=()=>{
    try { downloadText(designTokenJson(palette()),`${safeFileStem(project.name)}-tokens.json`,"application/json"); }
    catch(error) { document.querySelector("#status").textContent=status=error.message; }
  };
  const svgButton=document.querySelector("#export-svg");
  if (svgButton) svgButton.onclick=()=>{
    try { downloadText(paletteSvg(palette()),`${safeFileStem(project.name)}-palette.svg`,"image/svg+xml"); }
    catch(error) { document.querySelector("#status").textContent=status=error.message; }
  };
  document.querySelectorAll("[data-layer-fixture]").forEach((button)=>button.onclick=()=>{
    stopPlayback();
    preferences.fixtureId=button.dataset.layerFixture;
    preferences.view="light";
    preferences.module="canvas";
    savePreferences();
    render();
    document.querySelector("#fixture-select")?.focus();
  });
  document.querySelectorAll("[data-move-cue]").forEach((button)=>button.onclick=()=>{
    const cue=project.cues.find((item)=>item.id===preferences.cueId) ?? project.cues.at(-1);
    commitProjectChange("cue-reorder",(draft)=>{draft.cues=moveCue(draft.cues,cue.id,Number(button.dataset.moveCue));});
    render();
  });
  document.querySelector("#play-sequence").onclick=playSequence;
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
  document.querySelectorAll("[data-module]").forEach((button) => button.onclick = () => {
    const key=button.dataset.module;
    stopPlayback();
    if (key === "copilot") preferences.luxOpen=true;
    else preferences.module=key;
    if (key === "light") preferences.view="light";
    if (key === "palette") preferences.view="palette";
    savePreferences();
    status=t("statusModule") + button.textContent.trim();
    render();
  });
  document.querySelectorAll("[data-view]").forEach((button) => button.onclick = () => { preferences.view = button.dataset.view; savePreferences(); render(); });
  document.querySelectorAll("[data-tool]").forEach((button) => button.onclick = () => {
    preferences.tool=button.dataset.tool;
    if (preferences.tool === "fixture") { preferences.module="library"; preferences.view="light"; }
    if (preferences.tool === "orbit" || preferences.tool === "material") preferences.view="light";
    if (preferences.tool === "paletteBrush") preferences.view="palette";
    savePreferences();
    status=t("statusTool") + button.textContent.trim();
    render();
    if (preferences.tool === "orbit") document.querySelector("#light-canvas")?.focus();
    if (preferences.tool === "material") document.querySelector("#apply-scene")?.focus();
    if (preferences.tool === "paletteBrush") document.querySelector("#swatch-hex")?.focus();
  });
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
