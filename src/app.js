import { validateProject } from "./domain/project.js";
import { prepareEditorProject } from "./domain/editor-project.ts";
import { moveSwatch, removeSwatch, reorderSwatch } from "./domain/palette-store.js";
import { readImagePalette } from "./domain/image-file.ts";
import { customHueHarmony,perceptualScale } from "./domain/color-engine.js";
import { compositeSwatch,swatchCssColor } from "./domain/swatch-opacity.js";
import { snapshotPalette, restorePalette, comparePalettes } from "./domain/palette-versions.ts";
import { paletteRaster } from "./export/raster.js";
import { hslToRgb } from "./domain/color-engine.js";
import { suggestContrast } from "./domain/color-engine.js";
import { mapOklchToSrgb, oklabToOklch } from "./domain/color-engine.js";
import { createStudioMoodProject } from "./domain/studio-mood.js";
import { contrastResult, hexToRgb, isSrgbGamut, normalizeHex, rgbToHex, rgbToHsl, rgbToHsv, rgbToLab, rgbToOklab } from "./domain/color-engine.js";
import { rerollUnlocked, starterPalette, updateSwatch } from "./domain/palette-store.js";
import { localeNames, supportedLocales, translate } from "./i18n.js";
import { createLightLabRenderer } from "./light-lab/renderer.js";
import { lightLabFixtureState,lightLabRendererConfig,shouldReuseLightLabRenderer } from "./light-lab/renderer-lifecycle.js";
import { fixturePlacementMarkup } from "./light-lab/fixture-placement.js";
import { blackout, createFixture, dmxFrame, fixtureProfiles, getFixtureProfile, patchFixture, updateFixture } from "./dmx/engine.js";
import { createCue, duplicateCue, removeCue, editCue, evaluateCue, evaluateSequence, moveCue } from "./timeline/engine.js";
import { evaluateEffect } from "./timeline/effects.js";
import { createPlaybackClock, playbackPosition } from "./timeline/playback-clock.js";
import { timelineLayout } from "./timeline/layout.js";
import { arrangeTracks,arrangementDuration,evaluateTracks,scheduleCue } from "./timeline/tracks.js";
import { setChannelKeyframe } from "./timeline/keyframes.js";
import { roomDimensions } from "./domain/room.js";
import { duplicateFixture,deleteFixture } from "./domain/fixture-operations.ts";
import { readBrowserStorage,writeBrowserStorage } from "./domain/browser-storage.js";
import { applySceneMaterial } from "./domain/scene-materials.js";
import { studioActiveModule,studioDefaults } from "./ui/studio-preferences.js";
import { escapeHtml as esc,fixtureOptions,swatchButton } from "./ui/html.js";
import { virtualDmxPreview } from "./dmx/preview.js";
import { addCanvasObject,updateCanvasObject,duplicateCanvasObject,moveCanvasObject } from "./domain/canvas.js";
import { canvasMarkup } from "./ui/canvas.js";
import { canvasSvg } from "./export/canvas.js";
import { bindCanvasDrag } from "./ui/canvas-drag.js";
import { bindTimelineSeek } from "./ui/timeline-seek.js";
import { previewNativeToolAction } from "./ai/action-preview.js";
import { icon } from "./ui/icons.js";
import { previewQuality,previewQualities } from "./light-lab/quality.js";
import { temperaturePalette } from "./domain/temperature.js";
import { stageSettings,updateStage } from "./domain/stage.js";
import { createImageAssetStore } from "./domain/image-assets.ts";
import { createLuxServicePanel } from "./ui/lux-service.js";
import { createCanvasStateFeed } from "./ai/live-copilot.js";
import { createLiveCopilotPanel } from "./ui/live-copilot-panel.js";
import { arrangementTimelineMarkup } from "./ui/arrangement-timeline.js";
import { bindFixtureSliders } from "./ui/fixture-sliders.js";
import { bindCanvasMeasure } from "./ui/canvas-measure.js";
import { paletteAse } from "./export/ase.js";
import {topMenuMarkup,bindTopMenu} from "./ui/top-menu.js";
import {bindCommandMenus} from "./ui/command-menus.js";
import {createFloatingBot} from "./ui/floating-bot.js";
import {createAccount} from "./cloud/account.js";
import {openAccountDialog} from "./ui/account-dialog.js";
import {previewUnpatchedFixture,confirmAuthenticatedAction} from "./ai/authenticated-actions.js";
import { canFullscreen,toggleViewportFullscreen } from "./ui/fullscreen.js";
import { groupFixtures,saveFixtureGroup } from "./domain/fixture-groups.ts";
import { cueCsv, designTokenJson, paletteCss, paletteJson, paletteSvg, patchCsv, projectJson, safeFileStem } from "./export/formats.js";
import { readProjectFile } from "./domain/import-project.ts";
import { editorShortcut, isEditableTarget,toolShortcut,toolKeys } from "./accessibility/shortcuts.js";
import { commitTransaction, redoTransaction, undoTransaction } from "./domain/history.js";

const storageKey = "adigunlightdesign/project-v1";
const preferencesKey = "adigunlightdesign/preferences-v1";
const app = document.querySelector("#app");
const defaults = studioDefaults;
const preferences = { ...defaults, ...safeParse(readBrowserStorage(preferencesKey).value) };
preferences.seed=normalizeHex(preferences.seed) ?? defaults.seed;
if (!Object.hasOwn(previewQualities,preferences.previewQuality)) preferences.previewQuality="balanced";
let projectPersisted=false;
let luxProposal=null;
let luxConfirmationPending=false;
let viewportCamera=null;
let cleanupTopMenu=null, cleanupCommandMenus=null;
const imageAssets=createImageAssetStore();
const account=createAccount({publishableKey:typeof __ALD_SUPABASE_PUBLISHABLE_KEY__==="undefined" ? "" : __ALD_SUPABASE_PUBLISHABLE_KEY__});
const liveCanvasFeed=createCanvasStateFeed();
const floatingBot=createFloatingBot({getProjectId:()=>project.id,getUserId:()=>account.user?.id ?? "guest",getLocale:()=>preferences.locale,translate});
const liveCopilotPanel=createLiveCopilotPanel({feed:liveCanvasFeed,getLocale:()=>preferences.locale,translate,onNotify:()=>floatingBot.notify(),canAccept:()=>Boolean(account.user),onError:message=>setStatus(t(message)),onAccept:async(suggestion,isCurrent)=>{
  luxProposal=await previewUnpatchedFixture({getProject:()=>project,suggestion,account,isCurrent});render();floatingBot.open();document.querySelector("#confirm-lux-action")?.focus();
}});
const luxService=createLuxServicePanel({getProject:()=>project,getLocale:()=>preferences.locale,translate,imageAssets,onPreview:(proposal)=>{luxProposal=proposal;render();},onError:(message)=>setStatus(message),onNotify:()=>floatingBot.notify()});
let project = loadProject();
preferences.fixtureId ??= project.fixtures.at(-1)?.id;
let undoStack = [], redoStack = [], status = "", renderer = null, rendererConfigSignature = null, rendererFixtureSignature = null, rendererAccent = null, playbackTimer = null, playbackClock = null;

function safeParse(value) { try { return JSON.parse(value) ?? {}; } catch { return {}; } }
function loadProject() {
  const loaded = safeParse(readBrowserStorage(storageKey).value);
  if (validateProject(loaded).valid) {projectPersisted=true;return prepareEditorProject(loaded);}
  const starter=createStudioMoodProject();
  projectPersisted=writeBrowserStorage(storageKey,JSON.stringify(starter)).ok;
  return starter;
}
function t(key) { return translate(preferences.locale, key); }
function phrase(key, values = {}) { return t(key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? ""); }
function palette() { return project.palettes[0]; }
function selected() { return palette().colors.find((swatch) => swatch.id === preferences.selected) ?? palette().colors[0]; }
function scene() { if (!project.scenes[0]) project.scenes.push({ id:"studio-room", name:"Studio room", materialColor:"#C21888" }); const active=project.scenes.find((item)=>item.id===preferences.sceneId) ?? project.scenes[0]; preferences.sceneId=active.id; return active; }
function editScene(draft,update) { const index=Math.max(0,draft.scenes.findIndex((item)=>item.id===preferences.sceneId)); update(draft.scenes[index],index,draft.scenes); }
function sceneSelectMarkup() { const activeId=scene().id; return `<select id="scene-select" aria-label="${t("sceneHeader")}">${project.scenes.map((item,index)=>`<option value="${esc(item.id)}" ${item.id===activeId ? "selected" : ""}>${esc(`${t("sceneHeader")} ${String(index+1).padStart(2,"0")} / ${item.name}`)}</option>`).join("")}</select>`; }
function addVirtualFixture(profileId) { const fixture=createFixture(project.fixtures.length+1,profileId); commitProjectChange("fixture-add",(draft)=>{draft.fixtures=patchFixture([...draft.fixtures,fixture],fixture.id);}); preferences.fixtureId=fixture.id;savePreferences(); const patch=project.fixtures.find((item)=>item.id===fixture.id)?.patchAssignment; status=phrase("fixturePatched",{name:fixture.name,universe:1,address:patch?.startAddress ?? 1}); }
function activateBlackout() { commitProjectChange("dmx-blackout",(draft)=>{draft.fixtures=blackout(draft.fixtures);}); status="Virtual blackout applied. Physical output remains disabled."; }
function applyPaletteToVirtualFixtures() { const rgb=hexToRgb(selected().hex); commitProjectChange("palette-to-fixtures",(draft)=>{draft.fixtures=draft.fixtures.map((fixture)=>({ ...fixture, properties:{ ...fixture.properties, red:rgb.r, green:rgb.g, blue:rgb.b } }));}); updateRendererFromFixtures(); status=`${selected().hex} applied to ${project.fixtures.length} virtual fixture(s).`; }
function createCueSnapshot() {
  try {
    const timing={};
    for (const key of ["duration","fade","delay","fadeOut"]) {
      const input=document.querySelector(`#cue-${key}`);
      if (!input.value.trim() || !input.checkValidity()) throw new Error(`${t(key)}: enter a valid value.`);
      timing[key]=Number(input.value);
    }
    let cue;
    const groupId=document.querySelector("#cue-group").value;
    commitProjectChange("cue-create",(draft)=>{cue=createCue(groupFixtures(draft.fixtures,draft.fixtureGroups ?? [],groupId),{name:`Look ${draft.cues.length+1}`,...timing});draft.cues=[...draft.cues,cue];});
    status=`${cue.name} captured with ${cue.targets.length} fixture target(s).`;
    render();
  } catch(error) { document.querySelector("#status").textContent=status=error.message; }
}
function currentRendererFixtures() { return project.fixtures.map((fixture)=>({...fixture,selected:fixture.id===selectedFixture()?.id})); }
function updateRendererFromFixtures() { const fixtures=currentRendererFixtures();renderer?.setFixtures(fixtures);rendererFixtureSignature=lightLabFixtureState(fixtures); }
function updateDmxFeedback(fixtures) {
  const snapshot=virtualDmxPreview(fixtures,preferences.fixtureId);
  const monitor=document.querySelector("#virtual-dmx-monitor"),summary=document.querySelector(".timeline .dmx-actions span");
  if (monitor) monitor.textContent=`${t("universe")} ${snapshot.universe}\n${snapshot.channels.map((channel)=>`${String(channel.address).padStart(3,"0")} · ${channel.name}: ${channel.value}`).join("\n")}`;
  if (summary) summary.textContent=`U${snapshot.universe} · CH 1: ${snapshot.frame[0]} · ${t("outputDisabled")}`;
}
function previewFixtures(fixtures) {renderer?.setFixtures(fixtures);updateDmxFeedback(fixtures);}
function stopPlayback(message="Cue playback stopped.") { if(playbackTimer){clearInterval(playbackTimer);playbackTimer=null;} playbackClock=null; status=message; }
function togglePlaybackPause() {
  if (!playbackClock) return;
  if (playbackClock.paused) playbackClock.resume(performance.now());
  else playbackClock.pause(performance.now());
  const button=document.querySelector("#pause-playback");
  button.textContent=t(playbackClock.paused ? "resumePlayback" : "pausePlayback");
  button.setAttribute("aria-pressed",String(playbackClock.paused));
}
function playEffect() {
  const input=document.querySelector("#effect-period");
  if (!input.value.trim() || !input.checkValidity()) return input.reportValidity();
  const settings={type:document.querySelector("#effect-type").value,period:Number(input.value)};
  if (settings.type==="panTilt") { settings.minimum=64;settings.maximum=192; }
  const source=structuredClone(project.fixtures);
  if (!source.length) return;
  evaluateEffect(source,settings,0);
  stopPlayback();
  playbackClock=createPlaybackClock(performance.now());
  preferences.view="light";
  playbackTimer=setInterval(()=>{
    previewFixtures(evaluateEffect(source,settings,playbackClock.elapsed(performance.now())));
    document.querySelector("#status").textContent=`${t("virtualEffect")} · ${t(settings.type)}`;
  },100);
  render();
}
function playSequence({seek=0,paused=false}={}) {
  if (!project.cues.length) return;
  stopPlayback();
  const source=structuredClone(project.fixtures),cues=structuredClone(project.cues);
  playbackClock=createPlaybackClock(performance.now());
  playbackClock.seek(seek,performance.now());
  if (paused) playbackClock.pause(performance.now());
  const duration=cues.reduce((sum,cue)=>sum+cue.duration,0);
  preferences.view="light";
  playbackTimer=setInterval(()=>{
    const position=playbackPosition(playbackClock.elapsed(performance.now()),duration,Boolean(preferences.loopSequence));
    const frame=evaluateSequence(source,cues,position.time);
    previewFixtures(frame.fixtures);
    const scrub=document.querySelector("#sequence-seek");
    if (scrub && document.activeElement!==scrub) scrub.value=String(position.time);
    document.querySelector("#sequence-position").textContent=`${position.time.toFixed(1)} / ${duration.toFixed(1)} s`;
    document.querySelector("#timeline-playhead").style.left=`${position.time/timelineLayout(cues).span*100}%`;
    document.querySelector("#status").textContent=`${t("playSequence")} · ${Math.min(frame.index + 1,cues.length)}/${cues.length}`;
    if (position.complete && !playbackClock.paused) { stopPlayback(); render(); }
  },100);
  render();
  document.querySelector("#sequence-preview-details").open=true;
}
function playLatestCue() {
  const cue=project.cues.find((item)=>item.id===preferences.cueId) ?? project.cues.at(-1);
  if (!cue) return;
  stopPlayback();
  const source=structuredClone(project.fixtures);
  playbackClock=createPlaybackClock(performance.now());
  preferences.view="light";
  playbackTimer=setInterval(()=>{
    const elapsed=playbackClock.elapsed(performance.now());
    previewFixtures(evaluateCue(source,cue,elapsed));
    document.querySelector("#status").textContent=`Playing ${cue.name} · ${(Math.min(elapsed,cue.duration)).toFixed(1)}s / ${cue.duration}s`;
    if (elapsed>=cue.duration) { stopPlayback(`${cue.name} completed in virtual simulation.`); render(); }
  },100);
  render();
}
function playArrangement({seek=0,paused=false}={}) {
  if (!project.cues.length) return;
  stopPlayback();
  const source=structuredClone(project.fixtures),cues=structuredClone(project.cues),duration=arrangementDuration(cues);
  playbackClock=createPlaybackClock(performance.now());preferences.view="light";
  playbackClock.seek(seek,performance.now());
  if (paused) playbackClock.pause(performance.now());
  playbackTimer=setInterval(()=>{
    if(document.querySelector(".arrangement-timeline .timeline-ruler")?.dataset.seeking)return;
    const position=playbackPosition(playbackClock.elapsed(performance.now()),duration,Boolean(preferences.loopSequence));
    previewFixtures(evaluateTracks(source,cues,position.time));
    document.querySelector("#arrangement-playhead").style.left=`${position.time/Math.max(30,duration)*100}%`;
    document.querySelector(".arrangement-timeline .timeline-ruler").setAttribute("aria-valuenow",String(position.time));
    const slider=document.querySelector("#arrangement-seek");
    if (document.activeElement!==slider) slider.value=String(position.time);
    document.querySelector("#arrangement-position").textContent=`${position.time.toFixed(1)} / ${duration.toFixed(1)} s`;
    document.querySelector("#status").textContent=`${t("playTracks")} · ${position.time.toFixed(1)} s`;
    if (position.complete && !playbackClock.paused) {stopPlayback();render();}
  },100);
  render();
}
function downloadText(content, filename, type) { const file=new Blob([content],{type}); const link=document.createElement("a"); link.href=URL.createObjectURL(file); link.download=filename; link.click(); URL.revokeObjectURL(link.href); }
function exportFile(kind) { if(kind==="ase"){try{downloadText(paletteAse(palette()),`${safeFileStem(palette().name)}.ase`,"application/octet-stream");status=t("aseExportLimit");}catch(error){status=error.message;}document.querySelector("#status").textContent=status;return;} const stem=safeFileStem(project.name); const exports={ project:[projectJson(project),`${stem}.ald.json`,"application/json"], palette:[paletteJson(palette()),`${stem}-palette.json`,"application/json"], css:[paletteCss(palette()),`${stem}-palette.css`,"text/css"], patch:[patchCsv(project.fixtures),`${stem}-patch.csv`,"text/csv"], cues:[cueCsv(project.cues),`${stem}-cues.csv`,"text/csv"] }; const [content,name,type]=exports[kind]; downloadText(content,name,type); status=`${name} downloaded.`; document.querySelector("#status").textContent=status; }
function openCloudProject(document) {
  const next=prepareEditorProject(document);
  stopPlayback();
  undoStack=[structuredClone(project)];
  redoStack=[];
  project=next;
  saveProject();
  render();
}
async function importNativeProject(file) { const result=await readProjectFile(file); if(!result.valid) return setStatus(result.errors.join(" ")); stopPlayback(); project=prepareEditorProject(result.project); undoStack=[];redoStack=[];saveProject();status=project.name+" opened locally.";render(); }
function createNewProject() {
  if (!window.confirm(t("confirmNewProject"))) return;
  stopPlayback();
  const locale=preferences.locale,theme=preferences.theme;
  for (const key of Object.keys(preferences)) delete preferences[key];
  Object.assign(preferences,defaults,{locale,theme,sceneId:"studio-room"});
  project=createStudioMoodProject();
  preferences.fixtureId=project.fixtures.at(-1)?.id;
  undoStack=[];redoStack=[];
  savePreferences();
  saveProject();
  status=project.name+" created locally.";
  render();
}
function savePreferences() { if (!writeBrowserStorage(preferencesKey,JSON.stringify(preferences)).ok) status=t("preferencesNotSaved"); }
function saveProject() {
  project.updatedAt = new Date().toISOString();
  projectPersisted=writeBrowserStorage(storageKey,JSON.stringify(project)).ok;
  status=t(projectPersisted ? "statusSaved" : "storageUnavailable");
  const indicator=document.querySelector(".save-state");
  const headerSave=document.querySelector(".header-save-status");if(headerSave){headerSave.textContent=t(projectPersisted ? "savedLocally" : "sessionOnly");headerSave.classList.toggle("is-saved",projectPersisted);}
  if (indicator) {indicator.classList.toggle("is-unsaved",!projectPersisted);indicator.textContent=`● ${t(projectPersisted ? "saved" : "sessionOnly")}`;indicator.title=status;}
}
function commitProjectChange(label, mutate) { stopPlayback(); const next=commitTransaction({project,undoStack,redoStack},label,mutate); const validation=validateProject(next.project); if (!validation.valid) throw new Error(validation.errors.join(" ")); project=next.project;undoStack=next.undoStack;redoStack=next.redoStack;saveProject(); }
function mutateColours(fn) { commitProjectChange("palette-update",(draft)=>{draft.palettes[0].colors=fn(structuredClone(draft.palettes[0].colors));}); render(); }
function undo() { if (!undoStack.length) return setStatus(t("noUndo")); stopPlayback(); const next=undoTransaction({project,undoStack,redoStack});project=next.project;undoStack=next.undoStack;redoStack=next.redoStack;saveProject();status=t("statusUndo");render(); }
function redo() { if (!redoStack.length) return setStatus(t("noRedo")); stopPlayback(); const next=redoTransaction({project,undoStack,redoStack});project=next.project;undoStack=next.undoStack;redoStack=next.redoStack;saveProject();status=t("statusRedo");render(); }
function setStatus(value) { status = value; render(); }
function disabled(title) { return `disabled title="${esc(title)}"`; }
function compact(value, digits = 1) { return Number(value).toFixed(digits); }
function colourSpaceMarkup(hex) { const rgb=hexToRgb(hex),hsl=rgbToHsl(rgb),hsv=rgbToHsv(rgb),lab=rgbToLab(rgb),oklab=rgbToOklab(rgb); return `<section class="colour-space-card" aria-label="${t("colorSpaces")}"><h3>${t("colorSpaces")}</h3><dl><div><dt>sRGB</dt><dd>${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}</dd></div><div><dt>HSL</dt><dd>${compact(hsl.h)}° · ${compact(hsl.s*100)}% · ${compact(hsl.l*100)}%</dd></div><div><dt>HSV</dt><dd>${compact(hsv.h)}° · ${compact(hsv.s*100)}% · ${compact(hsv.v*100)}%</dd></div><div><dt>CIELAB</dt><dd>${compact(lab.l)}, ${compact(lab.a)}, ${compact(lab.b)}</dd></div><div><dt>OKLab</dt><dd>${compact(oklab.l,3)}, ${compact(oklab.a,3)}, ${compact(oklab.b,3)}</dd></div></dl><small class="${isSrgbGamut(rgb)?"pass":"fail"}">${isSrgbGamut(rgb)?t("inSrgb"):t("outsideSrgb")}</small></section>`; }
function fixtureLibraryMarkup() { return fixtureProfiles.map((profile)=>`<article><b>${esc(profile.model)}</b><small>${esc(profile.type)} · ${profile.modes[0].channels.length} CH</small><p>${esc(profile.validationStatus)} · ${esc(profile.provenance)}</p><button data-profile="${profile.id}">${t("addToVirtualPatch")}</button></article>`).join(""); }
function selectedFixture() { return project.fixtures.find((fixture)=>fixture.id===preferences.fixtureId) ?? project.fixtures[0]; }
function fixtureInspectorMarkup() { const fixture=selectedFixture(),profile=getFixtureProfile(fixture.profileId),mode=profile.modes.find((item)=>item.id===fixture.modeId) ?? profile.modes[0],patch=fixture.patchAssignment ?? {universe:1,startAddress:1}; return `<section class="fixture-inspector"><h3>${t("virtualFixture")}</h3><label>${t("fixtureLabel")}<select id="fixture-select">${fixtureOptions(project.fixtures,fixture.id)}</select></label><div class="fixture-profile-summary" title="${esc(profile.validationStatus)}"><span><small>Type</small><b>${esc(profile.type)}</b></span><span><small>Mode</small><b>${esc(mode?.name ?? profile.model)}</b></span></div><label>${t("colourName")}<input id="fixture-name" value="${esc(fixture.name)}" /></label>${fixturePlacementMarkup(fixture.transform,t("fixturePlacement"),t("fixtureDragHint"))}<div class="fixture-grid"><label>${t("universe")}<input id="fixture-universe" type="number" min="1" value="${patch.universe}" /></label><label>${t("startAddress")}<input id="fixture-address" type="number" min="1" max="512" value="${patch.startAddress}" /></label><label>${t("dimmer")}<input id="fixture-dimmer" type="number" min="0" max="255" value="${fixture.properties.dimmer ?? 0}" /></label><label>${t("beam")}<input id="fixture-beam" type="number" min="0" max="255" value="${fixture.properties.beam ?? 0}" /></label></div><button id="apply-fixture" class="wide">${t("applyFixtureProperties")}</button></section>`; }
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
      transform:Object.fromEntries(["x","y","z","rotation"].map((axis)=>[axis,value(`#fixture-${axis}`)])),
      properties:{dimmer:value("#fixture-dimmer"),...(document.querySelector("#fixture-beam") ? {beam:value("#fixture-beam")} : {}),...(()=>{
        const rgb=hexToRgb(document.querySelector("#fixture-colour").value);
        const blueChannel=document.querySelector("#fixture-blue-channel");
        const white=document.querySelector("#fixture-white");
        const aiming=Object.fromEntries(["pan","tilt"].filter((key)=>document.querySelector(`#fixture-${key}`)).map((key)=>[key,value(`#fixture-${key}`)]));
        return {red:rgb.r,green:rgb.g,blue:blueChannel ? value("#fixture-blue-channel") : rgb.b,...aiming,...(white ? {white:value("#fixture-white")} : {})};
      })()},
    };
    commitProjectChange("fixture-update",(draft)=>{draft.fixtures=updateFixture(draft.fixtures,fixture.id,changes);});
    updateRendererFromFixtures();
    status=phrase("fixtureUpdated",{name:selectedFixture().name});
    render();
  } catch(error) { document.querySelector("#status").textContent=status=error.message; }
}

function applyFixturePatch() {
  const fixture=selectedFixture();
  if (!fixture) return;
  const value=(id)=>{
    const input=document.querySelector(id);
    if (!input.value.trim() || !input.checkValidity()) throw new Error(`${input.closest("label").textContent.trim()}: enter a valid value.`);
    return Number(input.value);
  };
  try {
    const universe=value("#fixture-universe"),startAddress=value("#fixture-address");
    commitProjectChange("fixture-patch",(draft)=>{draft.fixtures=patchFixture(draft.fixtures,fixture.id,universe,startAddress);});
    updateRendererFromFixtures();
    status=phrase("fixturePatched",{name:fixture.name,universe,address:startAddress});
    render();
  } catch(error) { document.querySelector("#status").textContent=status=error.message; }
}
function render() {
  preferences.luxOpen=true; // Floating-window state controls visibility; keep its content mounted.
  cleanupTopMenu?.();
  cleanupCommandMenus?.();
  const previousCanvas=document.querySelector("#light-canvas");
  const nextRendererConfig=preferences.view==="light" ? lightLabRendererConfig(scene(),preferences.previewQuality,preferences.projection) : null;
  const reuseRenderer=shouldReuseLightLabRenderer({renderer,canvas:previousCanvas,view:preferences.view,previousConfig:rendererConfigSignature,nextConfig:nextRendererConfig});
  const liveSelection=preferences.view==="palette" && scene().canvasObjects?.some(object=>object.id===preferences.objectId)
    ? {kind:"object",id:preferences.objectId,sceneId:scene().id}
    : (preferences.inspectorMode ?? (preferences.view==="light" ? "fixture" : "palette"))==="fixture" && selectedFixture()
      ? {kind:"fixture",id:selectedFixture().id}
      : {kind:"swatch",id:selected().id,paletteId:palette().id};
  liveCanvasFeed.publish(project,{selection:liveSelection,playing:playbackTimer!==null});
  if(renderer){viewportCamera=renderer.cameraState?.() ?? viewportCamera;if(!reuseRenderer){renderer.destroy();renderer=null;rendererConfigSignature=null;rendererFixtureSignature=null;rendererAccent=null;}}
  document.documentElement.lang = preferences.locale;
  document.documentElement.dataset.theme = preferences.theme;
  const active = selected();
  const displayedSceneNumber=Math.max(1,project.scenes.findIndex((item)=>item.id===scene().id)+1);
  const contrastBackground=normalizeHex(preferences.contrastBackground) ?? "#0B1220";
  const contrast = contrastResult(compositeSwatch(active,contrastBackground), contrastBackground);
  const colourSpaces = colourSpaceMarkup(active.hex);
  const commandGroups={project:t("project"),history:t("commandHistory"),scene:t("sceneHeader"),palette:t("commandPalette"),fixtures:t("commandFixtures"),export:t("commandExport")};
  const nav = [
    ["palette", "◉", "moduleDesign"], ["light", "☼", "moduleStudio"], ["library", "▱", "moduleFixtures"], ["copilot", "◌", "moduleCopilot"]
  ].map(([key, icon, labelKey]) => `<button type="button" class="module ${studioActiveModule(preferences) === key ? "is-active" : ""}" data-module="${key}" aria-pressed="${studioActiveModule(preferences) === key}"><span>${icon}</span>${t(labelKey)}</button>`).join("");
  const commandMenuContent={
    project:`<button type="button" id="new-project">＋ ${t("newProject")}</button><button type="button" id="open-project">${t("openProject")}</button><button type="button" id="save">${t("save")}</button><button type="button" id="import-image" title="${t("importImage")}" aria-label="${t("importImage")}">${t("importAction")}</button><input id="project-file" type="file" accept="application/json,.json" hidden />`,
    history:`<button type="button" id="undo" ${undoStack.length ? "" : "disabled"}>↶ ${t("undo")}</button><button type="button" id="redo" ${redoStack.length ? "" : "disabled"}>↷ ${t("redo")}</button>`,
    scene:`<button type="button" data-open-scene-editor="room">${t("roomCommand")}</button><button type="button" data-open-scene-editor="stage">${t("stageCommand")}</button><label class="preview-quality">${t("previewQuality")} <select id="preview-quality" ${preferences.view==="light" ? "" : disabled(t("select3d"))}>${Object.keys(previewQualities).map((key)=>`<option value="${key}" ${key===(preferences.previewQuality ?? "balanced") ? "selected" : ""}>${t(`quality_${key}`)}</option>`).join("")}</select></label><button type="button" id="reset-camera">${t("resetCamera")}</button>`,
    palette:`<button type="button" id="open-versions">${t("versions")}</button><button type="button" id="open-compare">${t("compare")}</button>`,
    fixtures:"",
    export:`<button data-export="project">Project JSON</button><button data-export="palette">Palette JSON</button><button data-export="css">CSS variables</button><button data-export="ase" title="${t("aseExportLimit")}">${t("aseExport")}</button><button data-export="patch">Patch CSV</button><button data-export="cues">Cue CSV</button>`
  };
  const commandMenusMarkup=`<div class="command-menu-system" aria-label="${t("tools")}">${Object.entries(commandGroups).map(([key,label])=>`<div class="command-menu" data-command-menu="${key}"><button type="button" class="command-menu-trigger" data-command-menu-trigger="${key}" aria-haspopup="dialog" aria-expanded="false" aria-controls="command-menu-panel-${key}">${label} <span aria-hidden="true">⌄</span></button><div id="command-menu-panel-${key}" class="command-group command-menu-panel" data-command-group="${key}" popover="auto" role="dialog" aria-label="${label}"><span>${label}</span>${commandMenuContent[key]}</div></div>`).join("")}</div>`;
  const compactToolLabelKeys={paletteBrush:"brushShort",fixture:"fixtureShort",material:"materialShort",orbit:"orbitShort"};
  const tools = [["select","↖"],["paletteBrush","◉"],["fixture","☀"],["material","◆"],["shapes","□"],["text","T"],["measure","⌗"],["orbit","◎"]].map(([key, icon]) => `<button type="button" class="tool ${preferences.tool === key ? "is-active" : ""}" data-tool="${key}" aria-label="${esc(t(key))}"><span aria-hidden="true">${icon}</span>${esc(t(compactToolLabelKeys[key] ?? key))}</button>`).join("");
  const swatches = palette().colors.map((swatch)=>swatchButton(swatch,active.id)).join("");
  const patchedFixtures = project.fixtures.filter((fixture) => fixture.patchAssignment);
  const virtualFrame = dmxFrame(project.fixtures);
  const activeCue=project.cues.find((cue)=>cue.id===preferences.cueId) ?? project.cues.at(-1);
  const timeline=timelineLayout(project.cues);
  const cueBlocks = `<div class="timeline-scale"><div class="timeline-ruler">${timeline.ticks.map((tick)=>`<span style="left:${tick.left}%">${Number(tick.time.toFixed(1))}s</span>`).join("")}</div><div class="timeline-lane">${project.cues.map((cue,index) => `<button type="button" class="cue-block" data-cue="${esc(cue.id)}" aria-pressed="${cue.id===activeCue?.id}" title="${esc(cue.name)} · ${cue.duration}s" style="left:${timeline.segments[index].left}%;width:${timeline.segments[index].width}%">${esc(cue.name)} · ${cue.duration}s</button>`).join("") || `<small class="empty-cues">${t("noCues")}</small>`}</div><div id="timeline-playhead" class="timeline-playhead" aria-hidden="true"></div></div>`;
  app.innerHTML = `
    <header class="topbar">
      <div class="brand-lockup" aria-label="${t("brandAlt")}">
        <img class="corporate-mark" src="https://raw.githubusercontent.com/HephzibahBehulahHQ/hb-design-system/main/assets/corporate/hephzibah-behulah-official.jpg" alt="Hephzibah Behulah" onerror="this.hidden=true;this.nextElementSibling.hidden=false" />
        <span class="brand-fallback" hidden>HB <b>Hephzibah Behulah</b></span><span class="brand-divider"></span><span class="division">⚡ HB Elektroniker</span>
      </div>
      <div class="product-lockup"><strong>Adigun <span>Light</span> Design</strong><small>COLOR + LIGHT STUDIO</small></div>
      <div class="header-project-context" aria-label="${esc(t("project"))}: ${esc(project.name)} / ${esc(t("sceneHeader"))} ${String(displayedSceneNumber).padStart(2,"0")}"><span>${esc(project.name)}</span><b aria-hidden="true">•</b><span>${t("sceneHeader")} ${String(displayedSceneNumber).padStart(2,"0")}</span></div>
      ${topMenuMarkup({t,locale:preferences.locale,saved:projectPersisted,user:account.user})}<button id="theme" type="button" hidden aria-label="${t("appearance")}"></button>
    </header>
    <nav class="module-nav" aria-label="${t("appModules")}"><div class="workspace-modules">${nav}</div>${commandMenusMarkup}</nav>
    <main id="workspace" class="editor-layout">
      <aside class="left-rail panel">
        <div class="left-rail-heading"><h2>${t("project")} • ${t("layers")} • ${t("tools")}</h2></div>
        <section class="project-heading"><div><input id="project-name" value="${esc(project.name)}" aria-label="${t("project")} name" />${sceneSelectMarkup()}</div></section>
        <section class="layer-section"><h2>▰ ${t("layers")}</h2><ul class="layer-list"><li>⌄ ▣ ${t("layersLighting")} <span>◉</span></li><li>⌄ ▣ ${t("layersPalette")} <span>◉</span></li><li>⌄ ▣ ${t("layersScene")} <span>◉</span></li></ul></section>
        <section class="tool-section"><h2>☼ ${t("toolsOneClick")}</h2><div class="tool-list">${tools}</div></section>
      </aside>
      <section class="work-area">
        <div class="workspace-tabs panel"><strong class="studio-panel-title">${preferences.view === "light" ? `${t("sceneHeader")} ${String(displayedSceneNumber).padStart(2,"0")} / ${scene().id === "studio-room" ? t("mockupRoomTitle") : esc(scene().name)}` : `2D ${t("palette")} / ${esc(project.name)}`}</strong><small class="studio-panel-title-meta">${preferences.view === "light" ? t("viewportFixedHint") : t("palette")}</small><span></span><button id="viewport-projection" class="view-menu" ${preferences.view === "light" ? "" : disabled(t("select3d"))}>${t("perspective")}⌄</button></div>
        ${preferences.view === "light" ? `<div class="scene-preview light-canvas panel"><div class="scene-title"><b>${esc(project.name)} • ${t("rgbwPreview")}</b><small>${t("sceneView")} • ${t("rgbwPreviewSubtitle")}</small></div><canvas id="light-canvas" tabindex="0" aria-label="${t("previewLabel")}"></canvas><div class="canvas-actions"><button id="apply-scene">${t("paintSurface")}</button></div></div>` : `<div class="scene-preview panel" role="img" aria-label="${t("scenePreview")}"><div class="scene-title"><b>${t("scenePreview")}</b><small>${t("sceneNote")}</small></div><div class="beam beam-blue"></div><div class="beam beam-amber"></div><div class="beam beam-magenta"></div><div class="stage-truss"></div><div class="scene-wall"><div class="art-frame"></div><div class="couch"></div><div class="plant plant-left"></div><div class="plant plant-right"></div><div class="lamp"></div></div><div class="axis"><i>X</i><b>Y</b><em>Z</em></div></div>`}
        <div class="lower-workspace"><section class="palette-panel panel"><div class="section-title"><h2>◉ ${t("activePalette")} — ${esc(palette().name)}</h2></div><div class="swatches">${swatches}</div><div class="palette-actions"><input id="seed" value="${preferences.seed}" aria-label="Seed colour" maxlength="7" /><label class="harmony-command"><span>◇ ${t("harmonies")}</span><select id="harmony" aria-label="${t("harmony")}">${["analogous","complementary","splitComplementary","triadic","tetradic","square","monochromatic"].map((type) => `<option value="${type}" ${type === preferences.harmony ? "selected" : ""}>${type}</option>`).join("")}</select></label><button id="reroll">⟳ ${t("reroll")}</button><button id="add-colour">＋ ${t("add")}</button></div></section>
          <section class="timeline panel" tabindex="-1"><div class="section-title"><h2>◌ ${t("timeline")}</h2><span class="m-badge">M5 · ${t("simulationOnly")}</span></div><p>${project.fixtures.length ? `${t("universe")} 1 · ${patchedFixtures.length}/${project.fixtures.length} ${t("fixturesPatched")} · 1–${Math.max(0,...patchedFixtures.map((fixture)=>fixture.patchAssignment.startAddress+fixture.patchAssignment.channelFootprint-1))} ${t("activeChannels")}.` : t("noFixtures")}</p><div class="dmx-actions"><button id="add-fixture">＋ ${t("addWash")}</button><button id="apply-fixture-colour" ${project.fixtures.length ? "" : "disabled"}>${t("applySwatchToFixtures")}</button><button id="create-cue" ${project.fixtures.length ? "" : "disabled"}>＋ ${t("captureCue")}</button><button id="play-cue" ${project.cues.length ? "" : "disabled"}>▶ ${t("previewSelectedCue")}</button><button id="stop-cue" ${playbackTimer ? "" : "disabled"}>■ ${t("stop")}</button><span>CH 1: ${virtualFrame[0]} · ${t("outputDisabled")}</span></div><div class="cue-track" aria-label="${t("timeline")}">${cueBlocks}</div></section></div>
      </section>
      <aside class="inspector panel"><div class="section-title"><h2>◈ ${t("inspector")}</h2></div><div class="inspector-tabs"></div><div class="selected-preview" style="--selected:${active.hex}"></div><label>${t("colourName")}<input id="swatch-name" value="${esc(active.name)}" /></label><label>${t("hex")}<div class="input-row"><input id="swatch-hex" value="${active.hex}" spellcheck="false" /><button id="apply-colour">${t("applySwatchColour")}</button></div></label><button id="lock-swatch" class="wide">${active.locked ? "⌁ " + t("unlock") : "⌁ " + t("lock")}</button><section class="contrast-card"><h3>${t("contrast")}</h3><b>${contrast.ratio.toFixed(2)} : 1</b><span class="${contrast.aa ? "pass" : "fail"}">AA ${contrast.aa ? "pass" : "review"}</span><small>Against Midnight Navy #0B1220</small></section></aside>
      <aside class="lux-panel panel ${preferences.luxOpen ? "" : "is-collapsed"}"><div class="lux-heading"><div><span class="lux-icon">✦</span><h2>${t("luxTitle")} ✨</h2></div><button id="toggle-lux" class="subtle" aria-label="${preferences.luxOpen ? t("closePanel") : t("openLux")}">${preferences.luxOpen ? "×" : "✦"}</button></div>${preferences.luxOpen ? `<p class="lux-subtitle">${t("luxSubtitle")}</p><div class="lux-message"><b>${t("luxBrand")} · ${t("offline")}</b><p>${t("luxUnavailable")}</p><ul><li>${t("luxLocal")}</li><li>${t("luxNoUpload")}</li></ul></div><form id="lux-form" class="lux-input"><input id="lux-question" placeholder="${t("askLux")}" aria-label="${t("askLux")}" /><button aria-label="${t("sendLux")}">➤</button></form>` : ""}</aside>
    </main>
    <footer class="studio-footer"><span class="footer-ready"><i aria-hidden="true">●</i> ${t("ready").toUpperCase()} · ${esc(project.name)} / ${t("sceneHeader")} ${String(displayedSceneNumber).padStart(2,"0")} · 3D / ${t("virtualDmx")} · ${t(projectPersisted ? "projectSavedShort" : "sessionOnly")}</span><span id="status" role="status" aria-live="polite">${status || t("footerControls")}</span><span class="footer-shortcuts">${t("keyboardShortcuts")}</span></footer>`;
  if(reuseRenderer)document.querySelector("#light-canvas")?.replaceWith(previousCanvas);
  const commandMenus=document.querySelector(".command-menu-system");
  for(const [group,ids] of [["history",["undo","redo"]],["fixtures",["add-fixture","apply-fixture-colour"]]]){
    const host=commandMenus.querySelector(`[data-command-group="${group}"]`);
    for(const id of ids){const control=document.getElementById(id);if(control){host.append(control);control.classList.add("command-menu-item");}}
  }
  document.querySelector(".contrast-card").insertAdjacentHTML("beforebegin", colourSpaces);
  if (project.fixtures.length) document.querySelector(".selected-preview").insertAdjacentHTML("afterend", fixtureInspectorMarkup());
  if (preferences.module === "library") { const drawer=document.createElement("section"); drawer.className="library-drawer panel"; drawer.setAttribute("aria-label",t("library")); drawer.innerHTML=`<div class="section-title"><h2>▱ ${t("library")}</h2><button id="close-library" class="subtle" aria-label="${t("close")}">×</button></div><p>${t("virtualLibraryNote")}</p><div class="fixture-library">${fixtureLibraryMarkup()}</div>`; app.insertBefore(drawer,app.querySelector("footer")); }
  document.querySelector(".cue-track").insertAdjacentHTML("beforebegin", `<div class="cue-timing">${["duration","fade","delay"].map((key)=>`<label>${t(key)} (s)<input id="cue-${key}" type="number" required min="${key === "duration" ? ".1" : "0"}" step=".1" value="${key === "duration" ? "5" : key === "fade" ? "1" : "0"}" /></label>`).join("")}</div>`);
  if (activeCue) document.querySelector(".cue-track").insertAdjacentHTML("beforebegin", `<div class="cue-timing"><label>${t("timeline")}<input id="edit-cue-name" value="${esc(activeCue.name)}" /></label>${["duration","fade","delay"].map((key)=>`<label>${t(key)} (s)<input id="edit-cue-${key}" type="number" required min="0" step=".1" value="${activeCue[key] ?? 0}" /></label>`).join("")}<button id="edit-cue">${t("saveCueTiming")}</button></div>`);
  document.querySelector(".dmx-actions").insertAdjacentHTML("beforeend", `<button id="blackout" ${project.fixtures.length ? "" : "disabled"}>${t("blackout")}</button>`);
  document.querySelector(".dmx-actions").insertAdjacentHTML("beforeend", `<button id="play-sequence" ${project.cues.length ? "" : "disabled"}>▶ ${t("playCueList")}</button>`);
  const blackoutCommand=document.querySelector("#blackout"),fixtureCommandGroup=commandMenus.querySelector('[data-command-group="fixtures"]');
  if(blackoutCommand&&fixtureCommandGroup){fixtureCommandGroup.append(blackoutCommand);blackoutCommand.classList.add("command-menu-item");}
  document.querySelector("#stop-cue").insertAdjacentHTML("beforebegin", `<button id="pause-playback" aria-pressed="${Boolean(playbackClock?.paused)}" ${playbackTimer ? "" : "disabled"}>${t(playbackClock?.paused ? "resumePlayback" : "pausePlayback")}</button>`);
  const sequenceDuration=project.cues.reduce((sum,cue)=>sum+cue.duration,0);
  const tracks=arrangeTracks(project.cues);
  const sequenceTrack=document.querySelector(".timeline > .cue-track");
  document.querySelector(".timeline > .section-title").insertAdjacentHTML("afterend",arrangementTimelineMarkup(project.cues,activeCue?.id,t("noCues")));
  const sequenceDetails=document.createElement("details");sequenceDetails.className="fixture-group-editor";sequenceDetails.id="sequence-preview-details";
  sequenceDetails.innerHTML=`<summary>${t("playCueList")}</summary>`;
  sequenceTrack.replaceWith(sequenceDetails);sequenceDetails.append(sequenceTrack);
  document.querySelector("#stop-cue").insertAdjacentHTML("beforebegin",`<button id="play-tracks" ${project.cues.length ? "" : "disabled"}>▶ ${t("playTracks")}</button>`);
  document.querySelector("#create-cue").insertAdjacentHTML("beforebegin", `<label>${t("captureGroup")} <select id="cue-group"><option value="">${t("allFixtures")}</option>${(project.fixtureGroups ?? []).map((group)=>`<option value="${esc(group.id)}">${esc(group.name)}</option>`).join("")}</select></label>`);
  document.querySelector(".timeline").insertAdjacentHTML("beforeend", `<details class="fixture-group-editor"><summary>${t("fixtureGroups")}</summary><label>${t("groupName")} <input id="group-name" maxlength="120"></label><div>${project.fixtures.map((fixture)=>`<label><input type="checkbox" data-group-member value="${esc(fixture.id)}"> ${esc(fixture.name)}</label>`).join("")}</div><button id="save-group">${t("saveGroup")}</button>${(project.fixtureGroups ?? []).map((group)=>`<p>${esc(group.name)} · ${group.fixtureIds.length} <button data-delete-group="${esc(group.id)}">${t("deleteGroup")}</button></p>`).join("")}</details>`);
  document.querySelector(".timeline").insertAdjacentHTML("beforeend", `<div class="dmx-actions"><label><input id="sequence-loop" type="checkbox" ${preferences.loopSequence ? "checked" : ""}> ${t("loopSequence")}</label><label>${t("seekSequence")} <input id="sequence-seek" type="range" min="0" max="${sequenceDuration}" step="0.1" value="0" ${sequenceDuration ? "" : "disabled"}></label><output id="sequence-position">0 / ${sequenceDuration.toFixed(1)} s</output></div>`);
  document.querySelector(".timeline").insertAdjacentHTML("beforeend", `<div class="dmx-actions"><label>${t("virtualEffect")} <select id="effect-type"><option value="pulse">${t("pulse")}</option><option value="chase">${t("chase")}</option></select></label><label>${t("effectPeriod")} <input id="effect-period" type="number" min="0.1" max="120" step="0.1" value="2"></label><button id="play-effect" ${project.fixtures.length ? "" : "disabled"}>▶ ${t("previewEffect")}</button></div>`);
  if (activeCue) {
    const index=project.cues.indexOf(activeCue);
    const scheduled=tracks.flatMap((track)=>track.entries).find((entry)=>entry.cue.id===activeCue.id);
    document.querySelector("#edit-cue").insertAdjacentHTML("afterend", `<label>${t("trackName")}<input id="cue-track-name" maxlength="80" value="${esc(activeCue.trackId ?? "Main")}"></label><label>${t("startTime")}<input id="cue-start-time" type="number" min="0" step="0.1" required value="${scheduled.start}"></label><button id="schedule-cue">${t("scheduleCue")}</button>`);
    document.querySelector("#edit-cue").insertAdjacentHTML("afterend", `<button id="duplicate-cue">${t("duplicateCue")}</button><button id="delete-cue">${t("deleteCue")}</button>`);
    document.querySelector("#edit-cue").insertAdjacentHTML("afterend", `<button data-move-cue="-1" ${index === 0 ? "disabled" : ""}>← ${t("earlier")}</button><button data-move-cue="1" ${index === project.cues.length - 1 ? "disabled" : ""}>${t("later")} →</button>`);
  }
  if (document.querySelector(".fixture-inspector")) {
    const properties=selectedFixture().properties;
    const color=rgbToHex({r:properties.red ?? 0,g:properties.green ?? 0,b:properties.blue ?? 0});
    document.querySelector("#apply-fixture").insertAdjacentHTML("beforebegin", `<label class="fixture-colour-label">${t("colourLabel")}<span class="fixture-colour-control"><input id="fixture-colour" type="color" value="${color}" /><output id="fixture-colour-hex" aria-label="${t("selectedColour")} hex">${color.toUpperCase()}</output></span></label>`);
    const fixture=selectedFixture(),profile=getFixtureProfile(fixture.profileId);
    const mode=profile.modes.find((item)=>item.id===fixture.modeId);
    if (!mode?.channels.includes("beam")) document.querySelector("#fixture-beam").closest("label").remove();
    if (mode?.channels.includes("blue")) document.querySelector("#apply-fixture").insertAdjacentHTML("beforebegin", `<label>${t("blueChannel")} <output id="fixture-blue-channel-value">${Math.round((properties.blue ?? 0) / 255 * 100)}%</output><input id="fixture-blue-channel" type="range" min="0" max="255" step="1" value="${properties.blue ?? 0}" aria-label="${t("blueChannel")}" /></label>`);
    for (const key of ["pan","tilt"]) if (mode?.channels.includes(key)) document.querySelector("#apply-fixture").insertAdjacentHTML("beforebegin", `<label>${t(key)} (0–255)<input id="fixture-${key}" type="number" required min="0" max="255" step="1" value="${properties[key] ?? 127}" /></label>`);
    if (mode?.channels.includes("white")) document.querySelector("#apply-fixture").insertAdjacentHTML("beforebegin", `<label>${t("whiteChannel")}<input id="fixture-white" type="number" required min="0" max="255" step="1" value="${properties.white ?? 0}" /></label>`);
    const blueChannel=document.querySelector("#fixture-blue-channel"),blueValue=document.querySelector("#fixture-blue-channel-value"),colourInput=document.querySelector("#fixture-colour"),colourHex=document.querySelector("#fixture-colour-hex");
    if (blueChannel && blueValue && colourInput) {
      const updateBlue=()=>{const channel=Number(blueChannel.value);blueValue.textContent=`${Math.round(channel / 255 * 100)}%`;blueChannel.setAttribute("aria-valuetext",`${blueValue.textContent} · ${channel}/255`);};
      blueChannel.oninput=updateBlue;
      updateBlue();
    }
    if (colourInput && colourHex) colourInput.oninput=()=>{colourHex.textContent=colourInput.value.toUpperCase();if(blueChannel){blueChannel.value=String(hexToRgb(colourInput.value).b);blueValue.textContent=`${Math.round(Number(blueChannel.value)/255*100)}%`;blueChannel.setAttribute("aria-valuetext",`${blueValue.textContent} · ${blueChannel.value}/255`);}};
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
  if (project.fixtures.length) document.querySelector(".tool-section").insertAdjacentHTML("afterend", `<section class="fixture-list-section"><h2>${t("fixtureList")} <span>${project.fixtures.length}</span></h2><ul class="fixture-layer-list" aria-label="${t("layersLighting")}">${project.fixtures.map((fixture)=>`<li><button data-layer-fixture="${esc(fixture.id)}" aria-pressed="${fixture.id===selectedFixture()?.id}"><span>☼</span> ${esc(fixture.name)}</button></li>`).join("")}</ul></section>`);
  document.querySelector(".swatches").insertAdjacentHTML("afterend", `<p class="palette-summary">${t("seedColour")}: ${esc(preferences.seed)} · ${t("harmony")}: ${esc(preferences.harmony)} · ${palette().colors.length} ${t("summarySwatches")} · ${palette().colors.filter((colour)=>colour.locked).length} ${t("summaryLocked")}</p>`);
  document.querySelector(".export-grid")?.insertAdjacentHTML("beforeend", `<button id="export-svg">SVG</button><button id="export-pdf" aria-describedby="pdf-export-limit">${t("paletteSheetPdf")}</button><small id="pdf-export-limit">${t("pdfPaletteLimit")}</small><button id="export-cue-pdf" aria-describedby="cue-pdf-limit">${t("cueSheetPdf")}</button><small id="cue-pdf-limit">${t("cuePdfLimit")}</small><button id="export-tokens">${t("designTokens")}</button>`);
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
  document.querySelector(".palette-panel").insertAdjacentHTML("beforeend", `<div id="palette-versions-menu" class="palette-ribbon-popover" popover><div class="palette-actions"><button id="save-version">${t("saveVersion")}</button><select id="palette-version" aria-label="${t("savedVersions")}">${project.palettes.slice(1).map((item)=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("")}</select><button id="restore-version" ${project.palettes.length<2 ? "disabled" : ""}>${t("restoreVersion")}</button></div></div><div id="palette-compare-menu" class="palette-ribbon-popover" popover><div id="version-comparison"></div></div>`);

  document.querySelector("#lock-swatch").insertAdjacentHTML("beforebegin", `<label>${t("opacity")} (%)<input id="swatch-opacity" type="number" required min="0" max="100" step="any" value="${(active.opacity ?? 1)*100}" /></label><button id="apply-opacity" class="wide">${t("setSwatchOpacity")}</button>`);
  for (const button of document.querySelectorAll("[data-swatch]")) {
    const swatch=palette().colors.find((item)=>item.id===button.dataset.swatch);
    button.querySelector("span").style.background=swatchCssColor(swatch);
  }
  document.querySelector(".selected-preview").style.background=swatchCssColor(active);
  document.querySelector(".palette-panel").insertAdjacentHTML("beforeend", `<div class="palette-actions"><label>${t("hueSpacing")}<input id="custom-spacing" type="number" min="-360" max="360" step="any" value="30" /></label><button id="custom-hues">${t("customHues")}</button><button id="perceptual-scale">${t("perceptualScale")}</button></div>`);
  const arrangementEnd=arrangementDuration(project.cues);
  document.querySelector(".palette-panel").insertAdjacentHTML("beforeend", `<div class="palette-actions"><label>${t("temperatureStrength")} (%)<input id="temperature-strength" type="number" min="0" max="100" step="1" required value="20"></label><button data-temperature="warm">${t("warmPalette")}</button><button data-temperature="cool">${t("coolPalette")}</button></div>`);
  document.querySelectorAll("[data-module]").forEach((button)=>{button.querySelector("span").innerHTML=icon(button.dataset.module);});
  document.querySelectorAll("[data-tool]").forEach((button)=>{button.querySelector("span").innerHTML=icon(button.dataset.tool);});
  document.querySelector(".language > span").innerHTML=icon("globe");
  document.querySelector(".language").insertAdjacentHTML("beforeend", `<span class="locale-code" aria-hidden="true">${supportedLocales.includes(preferences.locale) ? preferences.locale.toUpperCase() : "EN"} ⌄</span>`);
  document.querySelector("#theme").innerHTML=icon(preferences.theme==="dark" ? "light" : "moon");
  document.querySelector(".lux-icon").innerHTML=icon("copilot");
  if (preferences.luxOpen) {
    document.querySelector(".lux-message").insertAdjacentHTML("afterend", `<section class="lux-local-actions"><h3>${t("localPaletteAction")}</h3><button id="preview-lux-palette" ${project.fixtures.length ? "" : "disabled"}>${t("previewPaletteLighting")}</button>${luxProposal ? `<div class="lux-action-preview"><h4>${t("reviewChanges")}</h4><ul>${luxProposal.changes.map((change)=>`<li>${esc(change.after?.name ?? change.before?.name ?? change.id)}<details><summary>${t("reviewChanges")}: ${esc(change.collection)}</summary><pre>${esc(JSON.stringify({before:change.before,after:change.after},null,2))}</pre></details></li>`).join("") || t("noActionChanges")}</ul><small>${t(account.user ? "liveReviewBeforeApply" : "authRequired")}</small><button id="confirm-lux-action" ${luxProposal.changes.length && account.user && !luxConfirmationPending ? "" : "disabled"} title="${t(account.user ? "confirmAction" : "authRequired")}">${t("confirmAction")}</button><button id="cancel-lux-action">${t("cancelAction")}</button></div>` : ""}</section>`);
  }
  const projectionButton=document.querySelector(".view-menu");
  document.querySelector(".workspace-tabs").insertAdjacentHTML("beforeend", `<button id="viewport-fullscreen" class="view-menu" aria-label="${t("fullscreenViewport")}" title="${t("fullscreenViewport")}" ${canFullscreen(document.querySelector(".scene-preview"),document) ? "" : "disabled"}>${icon("fullscreen")}</button>`);
  if (preferences.view==="light") { const previewCountLabel=`${t("webglPreview")} · ${phrase("previewFixtureCount",{shown:scene().visibility?.lighting===false ? 0 : Math.min(project.fixtures.length,previewQuality(preferences.previewQuality).fixtures),total:project.fixtures.length})}`; const previewSubtitle=document.querySelector(".scene-title small"); previewSubtitle.title=previewCountLabel; previewSubtitle.setAttribute("aria-label",previewCountLabel); }
  projectionButton.insertAdjacentHTML("afterend", `<button id="export-canvas" class="view-menu" ${preferences.view==="palette" ? "" : "disabled"}>↗ ${t("exportCanvas")}</button>`);
  const materialButton=document.querySelector("#apply-scene");
  if (materialButton) materialButton.insertAdjacentHTML("beforebegin", `<label>${t("paintColon")} <select id="material-target">${["wall","accent","floor","ceiling"].map((target)=>`<option value="${target}" ${preferences.materialTarget===target ? "selected" : ""}>${t(`surface_${target}`)}</option>`).join("")}</select></label>`);
  projectionButton.insertAdjacentHTML("afterend", `<button id="export-viewport" class="view-menu" ${preferences.view==="light" ? "" : "disabled"}>▣ ${t("exportViewport")}</button>`);
  projectionButton.textContent=`${t(preferences.projection==="orthographic" ? "orthographic" : "perspective")} ⌄`;
  projectionButton.setAttribute("aria-label",t("switchProjection"));
  document.querySelector("#effect-type").insertAdjacentHTML("beforeend", `<option value="panTilt">${t("panTilt")}</option>`);
  document.querySelector("#play-tracks").insertAdjacentHTML("afterend", `<label>${t("seekTracks")} <input id="arrangement-seek" type="range" min="0" max="${arrangementEnd}" step="0.1" value="0" ${arrangementEnd ? "" : "disabled"}></label><output id="arrangement-position">0 / ${arrangementEnd.toFixed(1)} s</output>`);
  const timelineTransport=document.createElement("div");
  timelineTransport.className="timeline-transport";
  timelineTransport.append(document.querySelector("#create-cue"),document.querySelector("#play-tracks"),document.querySelector("#pause-playback"),document.querySelector("#stop-cue"),document.querySelector("#sequence-loop").closest("label"),document.querySelector("#arrangement-position"));
  document.querySelector(".timeline > .section-title").append(timelineTransport);
  document.querySelector(".timeline > p").append(" ", document.querySelector(".timeline > .section-title .m-badge"));
  const timingDetails=document.createElement("details");
  document.querySelector("#cue-delay").parentElement.insertAdjacentHTML("afterend", `<label>${t("fadeOut")} (s)<input id="cue-fadeOut" type="number" min="0" step="0.1" required value="0"></label>`);
  if (activeCue) document.querySelector("#edit-cue-delay").parentElement.insertAdjacentHTML("afterend", `<label>${t("fadeOut")} (s)<input id="edit-cue-fadeOut" type="number" min="0" step="0.1" required value="${activeCue.fadeOut ?? 0}"></label><small>${t("holdTime")}: ${Math.max(0,activeCue.duration-(activeCue.delay ?? 0)-activeCue.fade-(activeCue.fadeOut ?? 0)).toFixed(1)} s</small>`);
  timingDetails.className="fixture-group-editor";
  const timingSummary=document.createElement("summary");
  timingSummary.textContent=t("cueSettings");timingDetails.append(timingSummary);
  document.querySelectorAll(".cue-timing").forEach((node)=>timingDetails.append(node));
  document.querySelector(".timeline").append(timingDetails);
  if (preferences.view==="palette") document.querySelector(".scene-preview").innerHTML=canvasMarkup(scene().canvasObjects ?? [],preferences.objectId,t("designCanvas"))+`<div class="canvas-actions"><label>${t("shapeKind")} <select id="shape-kind"><option value="rect" ${preferences.shapeKind!=="ellipse" ? "selected" : ""}>${t("rectangle")}</option><option value="ellipse" ${preferences.shapeKind==="ellipse" ? "selected" : ""}>${t("ellipse")}</option></select></label><button id="add-canvas-shape">＋ ${t("shapes")}</button></div>`;
  document.querySelector(".timeline").insertAdjacentHTML("beforeend", `<details class="fixture-group-editor"><summary>${t("virtualDmx")} · ${t("outputDisabled")}</summary><pre id="virtual-dmx-monitor"></pre></details>`);
  updateDmxFeedback(project.fixtures);
  const room=roomDimensions(scene().room);
  const stage=stageSettings(scene().stage);
  document.querySelector(".left-rail").insertAdjacentHTML("beforeend", `<details class="fixture-group-editor" data-scene-editor="stage"><summary>${t("stagePlatform")}</summary><label><input id="stage-enabled" type="checkbox" ${stage.enabled ? "checked" : ""}> ${t("showStage")}</label>${["x","y","z","width","height","depth"].map((key)=>`<label>${["x","y","z"].includes(key) ? key.toUpperCase() : t(key)} (m)<input id="stage-${key}" type="number" step="any" required value="${stage[key]}"></label>`).join("")}<label>${t("selectedColour")}<input id="stage-color" type="color" value="${stage.color}"></label><button id="apply-stage">${t("applyStageSettings")}</button></details>`);
  document.querySelector(".left-rail").insertAdjacentHTML("beforeend", `<details class="fixture-group-editor" data-scene-editor="room"><summary>${t("roomDimensions")}</summary>${["width","height","depth"].map((key)=>`<label>${t(key)} (m)<input id="room-${key}" type="number" required min="2" max="${key==="height" ? 20 : 50}" step="any" value="${room[key]}"></label>`).join("")}<button id="apply-room">${t("applyRoomDimensions")}</button></details>`);
  for (const [index,key] of ["lighting","palette","props"].entries()) {
    const item=document.querySelectorAll(".layer-list li")[index],visible=scene().visibility?.[key]!==false;
    item.querySelector("span").outerHTML=`<button data-layer-visibility="${key}" aria-pressed="${visible}" aria-label="${t("layerVisibility")}: ${t(["layersLighting","layersPalette","layersScene"][index])}">${visible ? "◉" : "○"}</button>`;
  }
  document.querySelector(".palette-panel").hidden=scene().visibility?.palette===false;
  document.querySelector(".scene-preview").classList.toggle("hide-lighting",scene().visibility?.lighting===false);
  document.querySelector(".scene-preview").classList.toggle("hide-props",scene().visibility?.props===false);
  if (activeCue) {
    const channels=activeCue.targets.flatMap((target)=>Object.keys(target.properties).map((property)=>({fixtureId:target.fixtureId,property})));
    timingDetails.insertAdjacentHTML("beforeend", `<fieldset><legend>${t("channelKeyframes")}</legend><label>${t("channel")}<select id="keyframe-channel">${channels.map((channel)=>`<option value="${esc(JSON.stringify(channel))}">${esc(project.fixtures.find((fixture)=>fixture.id===channel.fixtureId)?.name ?? channel.fixtureId)} · ${esc(channel.property)}</option>`).join("")}</select></label><label>${t("startTime")}<input id="keyframe-time" type="number" min="0" max="${activeCue.duration}" step="0.1" value="0" required></label><label>${t("channelValue")}<input id="keyframe-value" type="number" min="0" max="255" step="1" value="127" required></label><button id="save-keyframe" ${channels.length ? "" : "disabled"}>${t("saveKeyframe")}</button>${(activeCue.channelKeyframes ?? []).map((frame,index)=>`<p>${esc(frame.fixtureId)} · ${esc(frame.property)} · ${frame.time}s → ${frame.value} <button data-remove-keyframe="${index}" aria-label="${t("removeKeyframe")}">×</button></p>`).join("")}</fieldset>`);
  }
  const inspector=document.querySelector(".inspector"),fixturePanel=inspector.querySelector(".fixture-inspector");
  if (fixturePanel) fixturePanel.insertAdjacentHTML("beforeend", `<div class="dmx-actions"><button id="duplicate-fixture">${t("duplicateFixture")}</button><button id="delete-fixture">${t("deleteFixture")}</button></div>`);
  const mode=(preferences.inspectorMode ?? (preferences.view==="light" ? "fixture" : "palette"))==="fixture" && fixturePanel ? "fixture" : "palette";
  const palettePanel=document.createElement("div");palettePanel.id="palette-inspector-panel";
  for (const node of [...inspector.children]) if (!node.classList.contains("section-title") && !node.classList.contains("inspector-tabs") && node!==fixturePanel) palettePanel.append(node);
  inspector.append(palettePanel);
  const commandGroup=(name)=>document.querySelector(`.command-group[data-command-group="${name}"]`);
  const dock=(selector,groupName,wrap=false)=>{const control=document.querySelector(selector);if(control){const group=commandGroup(groupName);group.append(wrap ? control.closest("label") : control);}};
  dock("#reset-camera","scene");
  dock("#copy-object","history");dock("#delete-object","history");
  if(mode==="fixture"){dock("#duplicate-fixture","history");dock("#delete-fixture","history");}
  dock(".harmony-command","palette",true);dock("#reroll","palette");dock("#add-colour","palette");
  const exportGroup=commandGroup("export"),viewportExport=document.querySelector("#export-viewport"),canvasExport=document.querySelector("#export-canvas");
  if(viewportExport){viewportExport.textContent=`↑ ${t("exportPngShort")}`;viewportExport.setAttribute("aria-label",t("exportViewport"));viewportExport.title=t("exportViewport");exportGroup.insertBefore(viewportExport,exportGroup.children[1] ?? null);}
  if(canvasExport){canvasExport.textContent=`↗ ${t("exportCanvas")}`;canvasExport.setAttribute("aria-label",t("exportCanvas"));canvasExport.title=t("exportCanvas");exportGroup.insertBefore(canvasExport,viewportExport?.nextSibling ?? exportGroup.children[1] ?? null);}
  const canvasObject=scene().canvasObjects?.find((object)=>object.id===preferences.objectId);
  if (canvasObject && preferences.view==="palette") palettePanel.insertAdjacentHTML("beforeend", `<fieldset class="canvas-object-editor"><legend>${t("canvasObject")}</legend>${["x","y",...(canvasObject.type!=="text" ? ["width","height"] : ["fontSize"])].map((key)=>`<label>${["x","y"].includes(key) ? key.toUpperCase() : t(key)}<input data-object-value="${key}" type="number" step="any" required value="${canvasObject[key]}"></label>`).join("")}${canvasObject.type==="text" ? `<label>${t("text")}<input id="canvas-text" maxlength="2048" value="${esc(canvasObject.text)}"></label>` : ""}<button id="apply-object">${t("applyObjectChanges")}</button><button id="paint-object">${t("applySwatch")}</button><button id="delete-object">${t("deleteObject")}</button><button id="copy-object">${t("duplicateObject")}</button><button data-object-stack="-1">${t("sendBackward")}</button><button data-object-stack="1">${t("bringForward")}</button></fieldset>`);
  for (const key of ["shapes","text","measure"]) {const button=document.querySelector(`[data-tool="${key}"]`);button.disabled=false;button.removeAttribute("title");}
  for(const [key,tool] of Object.entries(toolKeys)){const button=document.querySelector(`[data-tool="${tool}"]`);if(button && !button.disabled){button.setAttribute("aria-keyshortcuts",key.toUpperCase());button.title=`${t(tool)} (${key.toUpperCase()})`;}}
  palettePanel.hidden=mode!=="palette";
  if (fixturePanel) {fixturePanel.id="fixture-inspector-panel";fixturePanel.hidden=mode!=="fixture";}
  inspector.querySelector(".inspector-tabs").innerHTML=`<button data-inspector="fixture" aria-pressed="${mode==="fixture"}" class="${mode==="fixture" ? "is-active" : ""}" ${fixturePanel ? "" : "disabled"}>${t("fixtureLabel")}</button><button data-inspector="palette" aria-pressed="${mode==="palette"}" class="${mode==="palette" ? "is-active" : ""}">${t("palette")}</button>`;
  if (fixturePanel && mode==="fixture") {
    const keys=["fixture","light","dmx","effects"];
    const bodies=Object.fromEntries(keys.map((key)=>{const body=document.createElement("section");body.className=`fixture-tab-body inspector-group inspector-group-${key}`;body.setAttribute("aria-label",t({fixture:"fixtureLabel",light:"lightTab",dmx:"dmxTab",effects:"effectsTab"}[key]));body.insertAdjacentHTML("afterbegin",`<h3>${t({fixture:"fixtureLabel",light:"lightTab",dmx:"dmxTab",effects:"effectsTab"}[key])}</h3>`);return [key,body];}));
    const profile=getFixtureProfile(selectedFixture().profileId);
    bodies.fixture.querySelector("h3").insertAdjacentHTML("beforeend",`<small class="fixture-profile-context">${t("fixtureProfile")} · ${esc(profile.type)} / ${t("virtualShort")}</small>`);
    for (const id of ["fixture-dimmer","fixture-beam","fixture-colour","fixture-blue-channel","fixture-white","fixture-pan","fixture-tilt"]) {
      const input=fixturePanel.querySelector(`#${id}`);if(input)bodies.light.append(input.closest("label"));
    }
    for (const id of ["fixture-universe","fixture-address"]) bodies.dmx.append(fixturePanel.querySelector(`#${id}`).closest("label"));
    const apply=fixturePanel.querySelector("#apply-fixture"),actions=fixturePanel.querySelector(".dmx-actions"),selectedFixtureField=fixturePanel.querySelector("#fixture-select")?.closest("label");
    selectedFixtureField?.classList.add("fixture-select-field");
    fixturePanel.querySelector(":scope > h3")?.remove();
    for (const node of [...fixturePanel.children]) if(node!==apply && node!==actions && node!==selectedFixtureField)bodies.fixture.append(node);
    const nameLabel=bodies.fixture.querySelector("#fixture-name")?.closest("label");
    const configuration=document.createElement("details");configuration.className="fixture-configuration-details";
    const configurationSummary=document.createElement("summary");configurationSummary.textContent="Name and position";configuration.append(configurationSummary);
    if(nameLabel)configuration.append(nameLabel);
    const placement=bodies.fixture.querySelector(".fixture-placement");
    if(placement){
      const readout=document.createElement("p");readout.className="fixture-position-summary";
      const refreshPosition=()=>{const value=(key)=>fixturePanel.querySelector(`#fixture-${key}`)?.value ?? "0";const coordinate=(key)=>Number(value(key)||0).toFixed(1),properties=selectedFixture().properties;
        readout.textContent=`Position X ${coordinate("x")} Y ${coordinate("y")} Z ${coordinate("z")}\nPan ${value("pan")||properties.pan||0} Tilt ${value("tilt")||properties.tilt||0} Rotation ${value("rotation")}`;};
      refreshPosition();
      for(const input of [...placement.querySelectorAll("input"),...["pan","tilt"].map((key)=>fixturePanel.querySelector(`#fixture-${key}`)).filter(Boolean)])input.addEventListener("input",refreshPosition);
      placement.replaceWith(configuration);configuration.append(placement);bodies.fixture.insertBefore(readout,configuration);
    } else if(nameLabel) {
      nameLabel.replaceWith(configuration);
    }
    const advancedLight=document.createElement("details");advancedLight.className="light-advanced-controls";
    const advancedTitle=document.createElement("summary");advancedTitle.textContent="More light controls";advancedLight.append(advancedTitle);
    for(const id of ["fixture-beam","fixture-white","fixture-pan","fixture-tilt"]){const input=bodies.light.querySelector(`#${id}`);if(input)advancedLight.append(input.closest("label"));}
    bodies.light.append(advancedLight);
    const effectControls=document.querySelector("#effect-type").closest(".dmx-actions");
    const effectScope=document.createElement("p");effectScope.textContent=t("allVirtualFixtures");bodies.effects.append(effectScope,effectControls);
    const outputNote=document.createElement("small");outputNote.className="fixture-output-note";outputNote.textContent=t("fixtureOutputNote");const applyPatch=document.createElement("button");applyPatch.type="button";applyPatch.id="apply-fixture-patch";applyPatch.className="wide";applyPatch.textContent=t("applyPatch");bodies.dmx.append(outputNote,applyPatch);bodies.fixture.append(apply);
    actions?.remove();
    fixturePanel.append(...Object.values(bodies));
    inspector.querySelector(".section-title h2").textContent=`${t("selectedFixtureTitle")}: ${selectedFixture().name}`;
    inspector.querySelector(".inspector-tabs").hidden=true;
  }
  const sceneEditorHost=fixturePanel ?? palettePanel;
  for(const editor of document.querySelectorAll("[data-scene-editor]"))sceneEditorHost.append(editor);
  document.querySelector(".scene-preview").insertAdjacentHTML("beforeend", `<button id="viewport-exit-fullscreen" class="viewport-exit-fullscreen">${t("exitFullscreen")}</button>`);
  bind();
  document.querySelectorAll("[data-open-scene-editor]").forEach((button)=>button.onclick=()=>{if(fixturePanel && (preferences.view!=="light" || preferences.inspectorMode!=="fixture")){preferences.view="light";preferences.module="light";preferences.inspectorMode="fixture";savePreferences();render();}const editor=document.querySelector(`[data-scene-editor="${button.dataset.openSceneEditor}"]`);if(editor){editor.open=true;editor.scrollIntoView({block:"nearest"});editor.querySelector("summary")?.focus({preventScroll:true});}});
  bindFixtureSliders(document.querySelector(".inspector"),{channelLabel:t("virtualChannelValue")});
  if(preferences.view==="light"){
    const axes=document.createElement("div");axes.className="viewport-axis-controls";axes.setAttribute("role","group");axes.setAttribute("aria-label",t("cameraAxisViews"));
    axes.innerHTML=["x","y","z"].map(axis=>`<button type="button" class="axis-view-${axis}" data-camera-axis="${axis}" title="${t(`cameraView_${axis}`)}" aria-label="${t(`cameraView_${axis}`)}" disabled>View ${axis.toUpperCase()}</button>`).join("");
    const sceneCommandGroup=document.querySelector('.command-group[data-command-group="scene"]');sceneCommandGroup.append(axes);const resetCameraCommand=document.querySelector("#reset-camera");if(resetCameraCommand)sceneCommandGroup.append(resetCameraCommand);axes.querySelectorAll("[data-camera-axis]").forEach(button=>button.onclick=()=>{renderer?.setView?.(button.dataset.cameraAxis);document.querySelector("#light-canvas")?.focus();});
  }
  const luxPanel=document.querySelector(".lux-panel");
  luxPanel.dataset.docked="true";
  inspector.append(luxPanel);
  floatingBot.mount(luxPanel);
  const composer=document.querySelector(".floating-bot [data-lux-request]");
  if (composer && !composer.classList.contains("bot-composer")) {
    composer.classList.add("bot-composer");
    composer.closest(".floating-bot").append(composer);
  }
  cleanupTopMenu=bindTopMenu({project,t,onAccount:()=>openAccountDialog({account,t,getProject:()=>project,onOpen:openCloudProject}),onSelect(result){
    stopPlayback();
    if(result.kind==="fixture"){preferences.fixtureId=result.id;preferences.inspectorMode="fixture";preferences.view="light";}
    else if(result.kind==="cue")preferences.cueId=result.id;
    else {preferences.view="palette";preferences.inspectorMode="palette";if(result.kind==="object")preferences.objectId=result.id;if(result.kind==="swatch")preferences.selected=result.id;}
    savePreferences();render();
    if(result.kind==="palette" && result.id!==palette().id){const versions=document.querySelector("#palette-version");if(versions){versions.value=result.id;versions.dispatchEvent(new Event("change"));}}
  }});
  cleanupCommandMenus=bindCommandMenus();
  if (preferences.view === "light") {
    const fixtures=currentRendererFixtures(),fixtureSignature=lightLabFixtureState(fixtures),accent=scene().materialColor;
    if(reuseRenderer){if(fixtureSignature!==rendererFixtureSignature)renderer.setFixtures(fixtures);if(accent!==rendererAccent)renderer.setAccent(accent);rendererFixtureSignature=fixtureSignature;rendererAccent=accent;}
    else {renderer=createLightLabRenderer(document.querySelector("#light-canvas"), {camera:viewportCamera,accent,room:scene().room,materials:scene().materials,stage:scene().stage,quality:preferences.previewQuality,projection:preferences.projection==="orthographic" ? "orthographic" : "perspective",visibility:scene().visibility,fixtures,onSelect(id){stopPlayback();preferences.fixtureId=id;preferences.inspectorMode="fixture";savePreferences();render();},onTransform(id,transform){commitProjectChange("fixture-move",(draft)=>{draft.fixtures=updateFixture(draft.fixtures,id,{transform});});updateRendererFromFixtures();}});rendererConfigSignature=nextRendererConfig;rendererFixtureSignature=fixtureSignature;rendererAccent=accent;}
    document.querySelectorAll("[data-camera-axis]").forEach(button=>button.disabled=!renderer.supported);
    if (!renderer.supported) {
      document.querySelector(".scene-title small").title=phrase("previewFixtureCount",{shown:0,total:project.fixtures.length}); document.querySelector(".scene-title small").setAttribute("aria-label",document.querySelector(".scene-title small").title);
      const note=document.createElement("p");
      note.className="webgl-unavailable";
      note.setAttribute("role","status");
      note.textContent=t("webglUnavailable");
      document.querySelector("#light-canvas").replaceWith(note);
      document.querySelector("#reset-camera").disabled=true;
      document.querySelector("#export-viewport").disabled=true;
    }
  }
}

function bind() {
  for(const id of ["viewport-fullscreen","viewport-exit-fullscreen"])document.querySelector(`#${id}`).onclick=async()=>{
    try {await toggleViewportFullscreen(document.querySelector(".scene-preview"),document);}
    catch {setStatus(t("fullscreenUnavailable"));}
  };
  document.querySelector("#apply-stage").onclick=()=>{
    try {
      const settings={enabled:document.querySelector("#stage-enabled").checked,color:document.querySelector("#stage-color").value};
      for(const key of ["x","y","z","width","height","depth"]) {const input=document.querySelector(`#stage-${key}`);if(!input.value.trim() || !input.checkValidity())return input.reportValidity();settings[key]=Number(input.value);}
      commitProjectChange("scene-stage-edit",(draft)=>{editScene(draft,(active,index)=>{draft.scenes[index]=updateStage(active,settings);});});render();
    }catch(error){setStatus(error.message);}
  };
  document.querySelectorAll("[data-temperature]").forEach((button)=>button.onclick=()=>{
    const input=document.querySelector("#temperature-strength");
    if(!input.value.trim() || !input.checkValidity())return input.reportValidity();
    mutateColours((colors)=>temperaturePalette(colors,button.dataset.temperature,Number(input.value)/100));
  });
  document.querySelector("#preview-quality").onchange=(event)=>{preferences.previewQuality=event.target.value;savePreferences();render();};
  document.querySelectorAll("[data-fixture-tab]").forEach((button)=>button.onclick=()=>{preferences.fixtureTab=button.dataset.fixtureTab;preferences.inspectorMode="fixture";savePreferences();render();});
  const previewLux=document.querySelector("#preview-lux-palette");if(previewLux)previewLux.onclick=()=>{
    try {luxProposal=previewNativeToolAction(project,{type:"adigunlightdesign.tool-call",version:1,name:"apply_palette_to_lights",payload:{paletteId:palette().id}});render();}catch(error){setStatus(error.message);}
  };
  const cancelLux=document.querySelector("#cancel-lux-action");if(cancelLux)cancelLux.onclick=()=>{luxProposal=null;render();};
  const confirmLux=document.querySelector("#confirm-lux-action");if(confirmLux)confirmLux.onclick=async()=>{
    if(luxConfirmationPending)return;const proposal=luxProposal;luxConfirmationPending=true;confirmLux.disabled=true;
    try {
      stopPlayback();
      const result=await confirmAuthenticatedAction({getState:()=>({project,undoStack,redoStack}),proposal,account,confirmed:true,isCurrent:()=>luxProposal===proposal});
      project=result.project;undoStack=result.undoStack;redoStack=result.redoStack;luxProposal=null;projectPersisted=false;status=t("botChangesUnsaved");
    } catch(error) {if(luxProposal===proposal)luxProposal=null;status=t(error.message);}
    finally{luxConfirmationPending=false;render();}
  };
  const shapeKind=document.querySelector("#shape-kind");if(shapeKind)shapeKind.onchange=()=>{preferences.shapeKind=shapeKind.value;savePreferences();};
  const addShape=document.querySelector("#add-canvas-shape");if(addShape)addShape.onclick=()=>document.querySelector('[data-tool="shapes"]').click();
  const copyObject=document.querySelector("#copy-object");if(copyObject)copyObject.onclick=()=>{
    try {const id=crypto.randomUUID();commitProjectChange("canvas-object-duplicate",(draft)=>{editScene(draft,(active,index)=>{draft.scenes[index]=duplicateCanvasObject(active,preferences.objectId,id);});});preferences.objectId=id;savePreferences();render();}catch(error){setStatus(error.message);}
  };
  document.querySelectorAll("[data-object-stack]").forEach((button)=>button.onclick=()=>{commitProjectChange("canvas-object-stack",(draft)=>{editScene(draft,(active,index)=>{draft.scenes[index]=moveCanvasObject(active,preferences.objectId,Number(button.dataset.objectStack));});});render();});
  const selectCanvasObject=(id)=>{preferences.objectId=id;preferences.inspectorMode="palette";savePreferences();render();};
  const designCanvas=document.querySelector(".design-canvas");
  if(designCanvas && preferences.tool==="measure")bindCanvasMeasure(designCanvas,{units:t("canvasUnits"),onMeasure:measurement=>{status=`${measurement.distance.toFixed(2)} ${t("canvasUnits")} · ${t("measureHelp")}`;document.querySelector("#status").textContent=status;}});
  if (designCanvas && preferences.tool!=="measure") bindCanvasDrag(designCanvas,scene().canvasObjects ?? [],{
    onSelect:selectCanvasObject,
    onResize(id,size){
      try {commitProjectChange("canvas-object-resize",(draft)=>{editScene(draft,(active,index)=>{draft.scenes[index]=updateCanvasObject(active,id,size);});});selectCanvasObject(id);}
      catch(error){setStatus(error.message);}
    },
    onMove(id,position){
      try {commitProjectChange("canvas-object-move",(draft)=>{editScene(draft,(active,index)=>{draft.scenes[index]=updateCanvasObject(active,id,position);});});selectCanvasObject(id);}
      catch(error){setStatus(error.message);}
    }
  });
  document.querySelector("#export-canvas").onclick=()=>{
    downloadText(canvasSvg(scene().canvasObjects ?? [],project.name),`${safeFileStem(project.name)}-canvas.svg`,"image/svg+xml");setStatus(t("canvasExported"));
  };
  document.querySelectorAll("[data-canvas-object]").forEach((element)=>{
    const select=()=>{preferences.objectId=element.dataset.canvasObject;preferences.inspectorMode="palette";savePreferences();render();};
    element.onkeydown=(event)=>{if (["Enter"," "].includes(event.key)){event.preventDefault();select();}};
  });
  const applyObject=document.querySelector("#apply-object");
  if (applyObject) applyObject.onclick=()=>{
    try {
      const changes={};
      for (const input of document.querySelectorAll("[data-object-value]")) {if (!input.value.trim() || !input.checkValidity()) return input.reportValidity();changes[input.dataset.objectValue]=Number(input.value);}
      const text=document.querySelector("#canvas-text");if(text)changes.text=text.value;
      commitProjectChange("canvas-object-edit",(draft)=>{editScene(draft,(active,index)=>{draft.scenes[index]=updateCanvasObject(active,preferences.objectId,changes);});});render();
    } catch(error) {setStatus(error.message);}
  };
  const paintObject=document.querySelector("#paint-object");if(paintObject)paintObject.onclick=()=>{commitProjectChange("canvas-object-paint",(draft)=>{editScene(draft,(active,index)=>{draft.scenes[index]=updateCanvasObject(active,preferences.objectId,{fill:selected().hex});});});render();};
  const deleteObject=document.querySelector("#delete-object");if(deleteObject)deleteObject.onclick=()=>{commitProjectChange("canvas-object-delete",(draft)=>{editScene(draft,(active)=>{active.canvasObjects=active.canvasObjects.filter((object)=>object.id!==preferences.objectId);});});preferences.objectId=null;render();};
  const duplicateFixtureButton=document.querySelector("#duplicate-fixture"),deleteFixtureButton=document.querySelector("#delete-fixture");
  if (duplicateFixtureButton) duplicateFixtureButton.onclick=()=>{
    try {
      const fixture=selectedFixture(),id=crypto.randomUUID();
      commitProjectChange("fixture-duplicate",(draft)=>Object.assign(draft,duplicateFixture(draft,fixture.id,{id,name:`${fixture.name} · ${t("copyLabel")}`})));
      preferences.fixtureId=id;savePreferences();render();
    } catch(error) {setStatus(error.message);}
  };
  if (deleteFixtureButton) deleteFixtureButton.onclick=()=>{
    const id=selectedFixture().id;
    commitProjectChange("fixture-delete",(draft)=>Object.assign(draft,deleteFixture(draft,id)));
    preferences.fixtureId=project.fixtures[0]?.id ?? null;savePreferences();render();
  };
  document.querySelector("#apply-room").onclick=()=>{
    try {
      const values={};
      for (const key of ["width","height","depth"]) {
        const input=document.querySelector(`#room-${key}`);
        if (!input.value.trim() || !input.checkValidity()) return input.reportValidity();
        values[key]=Number(input.value);
      }
      const room=roomDimensions(values);
      commitProjectChange("scene-room-resize",(draft)=>{editScene(draft,(active)=>{active.room=room;});});render();
    } catch(error) {setStatus(error.message);}
  };
  document.querySelector("#export-viewport").onclick=async()=>{
    if (!renderer?.supported) return;
    try {
      const blob=await renderer.capturePng(),url=URL.createObjectURL(blob);
      try {const link=document.createElement("a");link.href=url;link.download=`${safeFileStem(project.name)}-viewport.png`;link.click();}
      finally {URL.revokeObjectURL(url);}
      setStatus(t("viewportExported"));
    } catch(error) {setStatus(error.message);}
  };
  document.querySelector("#viewport-projection").onclick=()=>{preferences.projection=preferences.projection==="orthographic" ? "perspective" : "orthographic";savePreferences();render();};
  document.querySelectorAll("[data-layer-visibility]").forEach((button)=>button.onclick=()=>{
    const key=button.dataset.layerVisibility;
    commitProjectChange("scene-layer-visibility",(draft)=>{editScene(draft,(target)=>{target.visibility={...target.visibility,[key]:target.visibility?.[key]===false};});});render();
  });
  const keyframeButton=document.querySelector("#save-keyframe");
  if (keyframeButton) keyframeButton.onclick=()=>{
    try {
      const time=document.querySelector("#keyframe-time"),value=document.querySelector("#keyframe-value");
      for (const input of [time,value]) if (!input.value.trim() || !input.checkValidity()) return input.reportValidity();
      const channel=JSON.parse(document.querySelector("#keyframe-channel").value),cue=project.cues.find((item)=>item.id===preferences.cueId) ?? project.cues.at(-1);
      commitProjectChange("cue-keyframe-save",(draft)=>{draft.cues=draft.cues.map((item)=>item.id===cue.id ? setChannelKeyframe(item,{...channel,time:Number(time.value),value:Number(value.value)}) : item);});render();
    } catch(error) {setStatus(error.message);}
  };
  document.querySelectorAll("[data-remove-keyframe]").forEach((button)=>button.onclick=()=>{
    const cue=project.cues.find((item)=>item.id===preferences.cueId) ?? project.cues.at(-1);
    commitProjectChange("cue-keyframe-delete",(draft)=>{const target=draft.cues.find((item)=>item.id===cue.id);target.channelKeyframes.splice(Number(button.dataset.removeKeyframe),1);});render();
  });
  document.querySelectorAll("[data-inspector]").forEach((button)=>button.onclick=()=>{preferences.inspectorMode=button.dataset.inspector;savePreferences();render();});
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
  const updateComparison=()=>{
    const saved=project.palettes.find((item)=>item.id===document.querySelector("#palette-version").value);
    if (!saved) {comparison.innerHTML=`<p class="palette-empty-state">${t("saveVersionToCompare")}</p>`;return;}
    const cell=(color)=>color ? `<span style="background:${swatchCssColor(color)};display:inline-block;width:12px;height:12px"></span> ${esc(color.name)} ${swatchCssColor(color)}` : "—";
    comparison.innerHTML=`<table><thead><tr><th>${t("currentVersion")}</th><th>${t("savedVersions")}</th></tr></thead><tbody>${comparePalettes(palette(),saved).map((row)=>`<tr class="${row.changed ? "is-changed" : ""}"><td>${cell(row.current)}</td><td>${cell(row.saved)}</td></tr>`).join("")}</tbody></table>`;
  };
  document.querySelector("#palette-version").onchange=updateComparison;
  updateComparison();
  const openPalettePopover=(triggerSelector,popoverSelector)=>{
    const trigger=document.querySelector(triggerSelector),popover=document.querySelector(popoverSelector);
    trigger.onclick=()=>{
      const rect=trigger.getBoundingClientRect(),width=popoverSelector==="#palette-versions-menu" ? 320 : 420;
      popover.style.left=`${Math.max(8,Math.min(rect.left,window.innerWidth-width-8))}px`;
      popover.style.top=`${Math.min(rect.bottom+4,window.innerHeight-300)}px`;
      popover.showPopover();
    };
  };
  openPalettePopover("#open-versions","#palette-versions-menu");
  openPalettePopover("#open-compare","#palette-compare-menu");
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
      const colors=await readImagePalette(file,{onDecoded:(asset)=>imageAssets.add(asset)});
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
  const cuePdfButton=document.querySelector("#export-cue-pdf");
  if(cuePdfButton)cuePdfButton.onclick=async()=>{
    const snapshot=structuredClone(project.cues);
    const filename=`${safeFileStem(project.name)}-cues.pdf`;
    cuePdfButton.disabled=true;
    try {
      const {cuePdf}=await import("./export/pdf.js");
      downloadText(await cuePdf(snapshot),filename,"application/pdf");
    }catch(error){setStatus(error.message);}
    finally{cuePdfButton.disabled=false;}
  };
  const pdfButton=document.querySelector("#export-pdf");
  if(pdfButton)pdfButton.onclick=async()=>{
    const snapshot=structuredClone(palette()),filename=`${safeFileStem(project.name)}-palette.pdf`;pdfButton.disabled=true;
    try {const {palettePdf}=await import("./export/pdf.js");downloadText(await palettePdf(snapshot),filename,"application/pdf");}
    catch(error){setStatus(error.message);}finally{pdfButton.disabled=false;}
  };
  if (svgButton) svgButton.onclick=()=>{
    try { downloadText(paletteSvg(palette()),`${safeFileStem(project.name)}-palette.svg`,"image/svg+xml"); }
    catch(error) { document.querySelector("#status").textContent=status=error.message; }
  };
  document.querySelectorAll("[data-layer-fixture]").forEach((button)=>button.onclick=()=>{
    stopPlayback();
    preferences.fixtureId=button.dataset.layerFixture;
    preferences.inspectorMode="fixture";
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
  document.querySelector("#pause-playback").onclick=togglePlaybackPause;
  document.querySelector("#sequence-loop").onchange=(event)=>{preferences.loopSequence=event.target.checked;savePreferences();};
  document.querySelector("#sequence-seek").onchange=(event)=>playSequence({seek:Number(event.target.value),paused:true});
  document.querySelector("#play-effect").onclick=playEffect;
  document.querySelector("#play-tracks").onclick=playArrangement;
  document.querySelector("#arrangement-seek").onchange=(event)=>playArrangement({seek:Number(event.target.value),paused:true});
  bindTimelineSeek(document.querySelector(".arrangement-timeline .timeline-ruler"),{
    span:Math.max(30,arrangementDuration(project.cues)),duration:arrangementDuration(project.cues),value:playbackClock && arrangementDuration(project.cues)>0 ? playbackPosition(playbackClock.elapsed(performance.now()),arrangementDuration(project.cues),Boolean(preferences.loopSequence)).time : 0,label:t("seekTracks"),
    onPreview(time){document.querySelector("#arrangement-playhead").style.left=`${time/Math.max(30,arrangementDuration(project.cues))*100}%`;},
    onSeek(time,{keyboard}){playArrangement({seek:time,paused:true});if(keyboard)document.querySelector(".arrangement-timeline .timeline-ruler")?.focus();}
  });
  const scheduleButton=document.querySelector("#schedule-cue");
  if (scheduleButton) scheduleButton.onclick=()=>{
    try {
      const input=document.querySelector("#cue-start-time");
      if (!input.value.trim() || !input.checkValidity()) return input.reportValidity();
      const cue=project.cues.find((item)=>item.id===preferences.cueId) ?? project.cues.at(-1);
      const track=document.querySelector("#cue-track-name").value;
      commitProjectChange("cue-schedule",(draft)=>{draft.cues=scheduleCue(draft.cues,cue.id,track,Number(input.value));});render();
    } catch(error) {setStatus(error.message);}
  };
  document.querySelector("#save-group").onclick=()=>{
    try {
      const name=document.querySelector("#group-name").value,fixtureIds=[...document.querySelectorAll("[data-group-member]:checked")].map((input)=>input.value);
      const id=document.querySelector("#save-group").dataset.groupId || crypto.randomUUID();
      commitProjectChange("fixture-group-save",(draft)=>{draft.fixtureGroups=saveFixtureGroup(draft.fixtureGroups ?? [],draft.fixtures,{id,name,fixtureIds});});render();
    } catch(error) { setStatus(error.message); }
  };
  const clearGroupEditor=()=>{
    document.querySelector("#save-group").dataset.groupId="";
    document.querySelector("#group-name").value="";
    document.querySelectorAll("[data-group-member]").forEach((input)=>{input.checked=false;});
    document.querySelector("#group-name").focus();
  };
  document.querySelector("#save-group").insertAdjacentHTML("afterend", `<button id="new-group">${t("newGroup")}</button>`);
  document.querySelector("#new-group").onclick=clearGroupEditor;
  document.querySelectorAll("[data-delete-group]").forEach((button)=>{
    const edit=document.createElement("button");edit.textContent=t("editGroup");
    edit.onclick=()=>{
      const group=project.fixtureGroups.find((item)=>item.id===button.dataset.deleteGroup);
      document.querySelector("#save-group").dataset.groupId=group.id;
      document.querySelector("#group-name").value=group.name;
      document.querySelectorAll("[data-group-member]").forEach((input)=>{input.checked=group.fixtureIds.includes(input.value);});
      document.querySelector("#group-name").focus();
    };
    button.insertAdjacentElement("beforebegin",edit);
  });
  document.querySelectorAll("[data-delete-group]").forEach((button)=>button.onclick=()=>{
    commitProjectChange("fixture-group-delete",(draft)=>{draft.fixtureGroups=(draft.fixtureGroups ?? []).filter((group)=>group.id!==button.dataset.deleteGroup);});render();
  });
  const duplicateButton=document.querySelector("#duplicate-cue"),deleteButton=document.querySelector("#delete-cue");
  if (duplicateButton) duplicateButton.onclick=()=>{
    const cue=project.cues.find((item)=>item.id===preferences.cueId) ?? project.cues.at(-1);
    const id=crypto.randomUUID();
    commitProjectChange("cue-duplicate",(draft)=>{draft.cues=duplicateCue(draft.cues,cue.id,{id,name:`${cue.name} · ${t("copyLabel")}`});});
    preferences.cueId=id;savePreferences();render();
  };
  if (deleteButton) deleteButton.onclick=()=>{
    const cue=project.cues.find((item)=>item.id===preferences.cueId) ?? project.cues.at(-1);
    const index=project.cues.indexOf(cue);
    commitProjectChange("cue-delete",(draft)=>{draft.cues=removeCue(draft.cues,cue.id);});
    preferences.cueId=project.cues[Math.min(index,project.cues.length-1)]?.id ?? null;
    savePreferences();render();
  };
  const editButton=document.querySelector("#edit-cue");
  if (editButton) editButton.onclick=()=>{
    try {
      const changes={name:document.querySelector("#edit-cue-name").value};
      for (const key of ["duration","fade","delay","fadeOut"]) {
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
    if(key==="copilot"){floatingBot.open();return;}
    stopPlayback();
    preferences.module=key;
    if (key === "light") { preferences.view="light"; preferences.inspectorMode="fixture"; }
    if (key === "palette") { preferences.view="palette"; preferences.inspectorMode="palette"; }
    savePreferences();
    status=t("statusModule") + button.textContent.trim();
    render();
  });
  document.querySelectorAll("[data-tool]").forEach((button) => button.onclick = () => {
    preferences.tool=button.dataset.tool;
    if (["shapes","text"].includes(preferences.tool)) {
      const id=crypto.randomUUID();
      commitProjectChange("canvas-object-add",(draft)=>{editScene(draft,(active,index)=>{draft.scenes[index]=addCanvasObject(active,preferences.tool==="shapes" ? (preferences.shapeKind==="ellipse" ? "ellipse" : "rect") : "text",selected().hex,{id,text:t("text")});});});
      preferences.objectId=id;preferences.view="palette";preferences.inspectorMode="palette";
    }
    if (preferences.tool === "fixture") { preferences.module="library"; preferences.view="light"; }
    if (preferences.tool === "orbit" || preferences.tool === "material") preferences.view="light";
    if (["paletteBrush","measure"].includes(preferences.tool)) preferences.view="palette";
    savePreferences();
    status=t("statusTool") + button.textContent.trim();
    render();
    if(preferences.tool==="text"){const editor=document.querySelector("#canvas-text");editor?.focus({preventScroll:true});editor?.select();}
    if(preferences.tool==="measure"){document.querySelector(".design-canvas")?.focus();status=t("measureHelp");document.querySelector("#status").textContent=status;}
    if (preferences.tool === "orbit") document.querySelector("#light-canvas")?.focus();
    if (preferences.tool === "material") document.querySelector("#apply-scene")?.focus();
    if (preferences.tool === "paletteBrush") document.querySelector("#swatch-hex")?.focus();
  });
  document.querySelectorAll("[data-swatch]").forEach((button) => button.onclick = () => { preferences.selected = button.dataset.swatch; preferences.inspectorMode="palette"; savePreferences(); render(); });
  document.querySelector("#project-name").onchange = (event) => { const name=event.target.value.trim(); if(name&&name!==project.name) commitProjectChange("project-rename",(draft)=>{draft.name=name;}); render(); };
  const sceneSelect=document.querySelector("#scene-select");if(sceneSelect)sceneSelect.onchange=(event)=>{if(!project.scenes.some((item)=>item.id===event.target.value))return;preferences.sceneId=event.target.value;preferences.objectId=null;savePreferences();render();};
  document.querySelector("#seed").onchange = (event) => { const hex = normalizeHex(event.target.value); if (hex) preferences.seed = hex; event.target.value = preferences.seed; savePreferences(); };
  document.querySelector("#harmony").onchange = (event) => { preferences.harmony = event.target.value; savePreferences(); };
  document.querySelector("#reroll").onclick = () => mutateColours((colours) => rerollUnlocked(colours, preferences.seed, preferences.harmony));
  document.querySelector("#add-colour").onclick = () => mutateColours((colours) => { const id = `swatch-${Date.now()}`; preferences.selected = id; return [...colours, { id, name:`Swatch ${colours.length + 1}`, hex:preferences.seed, locked:false }]; });
  document.querySelector("#apply-colour").onclick = () => { const name = document.querySelector("#swatch-name").value.trim(), hex = normalizeHex(document.querySelector("#swatch-hex").value); if (!hex) return setStatus("Enter a valid 3- or 6-digit HEX value."); mutateColours((colours) => updateSwatch(colours, selected().id, { name:name || selected().name, hex })); };
  document.querySelector("#lock-swatch").onclick = () => mutateColours((colours) => updateSwatch(colours, selected().id, { locked:!selected().locked }));
  document.querySelector("#save").onclick = () => { saveProject(); render(); };
  document.querySelector("#new-project").onclick=createNewProject;
  document.querySelector("#undo").onclick = undo; document.querySelector("#redo").onclick = redo;
  document.querySelector("#toggle-lux").onclick = () => { preferences.luxOpen = !preferences.luxOpen; savePreferences(); render(); };
  const materialTarget=document.querySelector("#material-target");if(materialTarget) materialTarget.onchange=()=>{preferences.materialTarget=materialTarget.value;savePreferences();};
  const applyScene = document.querySelector("#apply-scene"); if (applyScene) applyScene.onclick = () => { const target=materialTarget.value;commitProjectChange("scene-material",(draft)=>{editScene(draft,(active,index)=>{draft.scenes[index]=applySceneMaterial(active,target,selected().hex);});});status = `${t("apply")} ${selected().hex}`;render(); };
  const resetCamera = () => renderer?.reset();
  document.querySelector("#reset-camera")?.addEventListener("click",resetCamera);
  document.querySelector("#add-fixture").onclick = () => { addVirtualFixture(); render(); };
  const blackoutButton = document.querySelector("#blackout"); if (blackoutButton) blackoutButton.onclick = () => { activateBlackout(); render(); };
  document.querySelector("#apply-fixture-colour").onclick = () => { applyPaletteToVirtualFixtures(); render(); };
  document.querySelector("#create-cue").onclick = createCueSnapshot;
  document.querySelector("#play-cue").onclick = playLatestCue;
  document.querySelector("#stop-cue").onclick = () => { stopPlayback(); render(); };
  document.querySelectorAll("[data-export]").forEach((button) => button.onclick = () => exportFile(button.dataset.export));
  const closeExports = document.querySelector("#close-exports"); if (closeExports) closeExports.onclick = () => { preferences.module="canvas"; render(); };
  const openButton=document.querySelector("#open-project"), projectFile=document.querySelector("#project-file"); if(openButton&&projectFile){openButton.onclick=()=>projectFile.click();projectFile.onchange=()=>{const [file]=projectFile.files;if(file) importNativeProject(file);};}
  const imageImportButton=document.querySelector("#import-image"),paletteImage=document.querySelector("#palette-image");if(imageImportButton&&paletteImage)imageImportButton.onclick=()=>paletteImage.click();
  document.querySelectorAll("[data-profile]").forEach((button)=>button.onclick=()=>{addVirtualFixture(button.dataset.profile);render();});
  const closeLibrary=document.querySelector("#close-library"); if(closeLibrary) closeLibrary.onclick=()=>{preferences.module="canvas";render();};
  const fixtureSelect=document.querySelector("#fixture-select"); if(fixtureSelect) fixtureSelect.onchange=()=>{preferences.fixtureId=fixtureSelect.value;savePreferences();render();};
  const applyFixture=document.querySelector("#apply-fixture"); if(applyFixture) applyFixture.onclick=applyFixtureInspector;
  const applyFixturePatchButton=document.querySelector("#apply-fixture-patch"); if(applyFixturePatchButton) applyFixturePatchButton.onclick=applyFixturePatch;
  const form = document.querySelector("#lux-form"); if (form) {const liveHost=document.createElement("section");liveHost.className="live-copilot-panel";form.before(liveHost);liveCopilotPanel.mount(liveHost);const host=document.createElement("section");host.dataset.luxService="";host.className="lux-service";form.replaceWith(host);luxService.mount(host);}
}
window.addEventListener("keydown", (event) => { if (isEditableTarget(event.target) || event.defaultPrevented || event.isComposing) return; const tool=toolShortcut(event);if(tool){const button=document.querySelector(`[data-tool="${tool}"]`);if(button && !button.disabled){event.preventDefault();button.click();}return;} const shortcut=editorShortcut(event); if (!shortcut) return; event.preventDefault(); if (shortcut === "save") { saveProject(); render(); } else if (shortcut === "undo") undo(); else redo(); });
account.subscribe(()=>render());
render();


