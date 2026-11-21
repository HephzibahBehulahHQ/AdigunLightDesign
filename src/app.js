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
import { normalizeCameraState,roomFitCameraDistance } from "./light-lab/math.js";
import { lightLabFixtureState,lightLabRendererConfig,shouldReuseLightLabRenderer } from "./light-lab/renderer-lifecycle.js";
import { fixturePlacementMarkup } from "./light-lab/fixture-placement.js";
import { blackout, createFixture, dmxFrame, fixtureProfiles, getFixtureProfile, patchFixture, updateFixture } from "./dmx/engine.js";
import { createCue, duplicateCue, removeCue, editCue, evaluateCue, moveCue } from "./timeline/engine.js";
import { evaluateEffect } from "./timeline/effects.js";
import { createPlaybackClock, playbackPosition } from "./timeline/playback-clock.js";
import { timelineLayout } from "./timeline/layout.js";
import { arrangeTracks,arrangementDuration,evaluateTracks,scheduleCue } from "./timeline/tracks.js";
import { setChannelKeyframe } from "./timeline/keyframes.js";
import { roomDimensions } from "./domain/room.js";
import { fixturePlacementForRoom } from "./domain/fixture-placement.js";
import { applyRoomLightingLook,createRoomStarterLighting,isRoomLightingLookIndex,roomLightingLooks } from "./domain/room-lighting-looks.js";
import { createRoomScene,roomAmbience,roomPresetName,roomPresetOptions } from "./domain/room-presets.js";
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
import {helpGuideMarkup} from "./ui/help-guide.js";
import {createMoodMusic,musicMoods} from "./audio/mood-music.js";
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

const savedProjectsKey = "adigunlightdesign/saved-projects-v1";
const preferencesKey = "adigunlightdesign/preferences-v1";
const app = document.querySelector("#app");
const studioRoute = () => {
  const inStudio = location.hash === "#AdigunStudio";
  document.body.classList.toggle("studio-route", inStudio);
  if (inStudio) window.scrollTo(0, 0);
};
window.addEventListener("hashchange", studioRoute);
studioRoute();
const defaults = studioDefaults;
const preferences = { ...defaults, ...safeParse(readBrowserStorage(preferencesKey).value) };
preferences.seed=normalizeHex(preferences.seed) ?? defaults.seed;
preferences.roomMusicMood=musicMoods.some(({id})=>id===preferences.roomMusicMood)?preferences.roomMusicMood:musicMoods[0].id;
preferences.roomMusicVolume=Number.isFinite(preferences.roomMusicVolume)?Math.max(0,Math.min(1,preferences.roomMusicVolume)):.22;
const roomMusic=createMoodMusic();roomMusic.setMood(preferences.roomMusicMood);roomMusic.setVolume(preferences.roomMusicVolume);
if (!Object.hasOwn(previewQualities,preferences.previewQuality)) preferences.previewQuality="balanced";
let projectPersisted=false;
let projectDirty=false;
let activeSavedProjectId=null;
let luxProposal=null;
let luxConfirmationPending=false;
let viewportCamera=null;
let viewportCameraRoomKey=null;
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
document.addEventListener("keydown",event=>{
  if(event.key!=="Escape")return;
  const fixtureMenu=document.querySelector("#fixture-list:popover-open");
  if(!fixtureMenu)return;
  event.preventDefault();event.stopPropagation();fixtureMenu.hidePopover();
  document.querySelector("#toggle-fixtures")?.focus({preventScroll:true});
});
preferences.fixtureId ??= project.fixtures.at(-1)?.id;
let undoStack = [], redoStack = [], status = "", renderer = null, rendererConfigSignature = null, rendererFixtureSignature = null, rendererAccent = null, playbackTimer = null, playbackClock = null;

function safeParse(value) { try { return JSON.parse(value) ?? {}; } catch { return {}; } }
function loadProject() {
  projectPersisted=false;
  projectDirty=false;
  activeSavedProjectId=null;
  return createStudioMoodProject();
}
function t(key) { return translate(preferences.locale, key); }
function phrase(key, values = {}) { return t(key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? ""); }
function palette() { return project.palettes[0]; }
function selected() { return palette().colors.find((swatch) => swatch.id === preferences.selected) ?? palette().colors[0]; }
function scene() { if (!project.scenes[0]) project.scenes.push({ id:"studio-room", name:"Living room", roomType:"living-room", materialColor:"#C21888" }); const active=project.scenes.find((item)=>item.id===preferences.sceneId) ?? project.scenes[0]; preferences.sceneId=active.id; return active; }
function sceneFixtures(fixtures=project.fixtures,sceneId=scene().id,scenes=project.scenes) { const legacySceneId=scenes[0]?.id ?? "studio-room"; return fixtures.filter((fixture)=>(fixture.sceneId ?? legacySceneId)===sceneId); }
function sceneCues(cues=project.cues,sceneId=scene().id,scenes=project.scenes) { const legacySceneId=scenes[0]?.id ?? "studio-room"; return cues.filter((cue)=>(cue.sceneId ?? legacySceneId)===sceneId); }
function replaceSceneCues(cues,replacements,sceneId=scene().id,scenes=project.scenes) { const legacySceneId=scenes[0]?.id ?? "studio-room",belongs=(cue)=>(cue.sceneId ?? legacySceneId)===sceneId,first=cues.findIndex(belongs),others=cues.filter((cue)=>!belongs(cue)),index=first<0 ? others.length : cues.slice(0,first).filter((cue)=>!belongs(cue)).length; others.splice(index,0,...replacements); return others; }
function editScene(draft,update) { const index=Math.max(0,draft.scenes.findIndex((item)=>item.id===preferences.sceneId)); update(draft.scenes[index],index,draft.scenes); }
function sceneSelectMarkup() { const activeId=scene().id; return `<select id="scene-select" aria-label="${t("sceneHeader")}">${project.scenes.map((item,index)=>`<option value="${esc(item.id)}" ${item.id===activeId ? "selected" : ""}>${esc(`${t("sceneHeader")} ${String(index+1).padStart(2,"0")} / ${item.name}`)}</option>`).join("")}</select>`; }
function addVirtualFixture(profileId) {
  const activeScene=scene(),created=createFixture(project.fixtures.length+1,profileId);
  const fixture={...created,sceneId:activeScene.id,transform:{...created.transform,...fixturePlacementForRoom(profileId,activeScene.room,sceneFixtures())}};
  commitProjectChange("fixture-add",(draft)=>{draft.fixtures=patchFixture([...draft.fixtures,fixture],fixture.id);});
  preferences.fixtureId=fixture.id;savePreferences();
  const patch=project.fixtures.find((item)=>item.id===fixture.id)?.patchAssignment;
  status=phrase("fixturePatched",{name:fixture.name,universe:1,address:patch?.startAddress ?? 1});
}
function activateBlackout() { const ids=new Set(sceneFixtures().map((fixture)=>fixture.id));commitProjectChange("dmx-blackout",(draft)=>{const values=new Map(blackout(draft.fixtures.filter((fixture)=>ids.has(fixture.id))).map((fixture)=>[fixture.id,fixture]));draft.fixtures=draft.fixtures.map((fixture)=>values.get(fixture.id) ?? fixture);}); status="Virtual blackout applied. Physical output remains disabled."; }
function applyPaletteToVirtualFixtures() { const rgb=hexToRgb(selected().hex),ids=new Set(sceneFixtures().map((fixture)=>fixture.id)); commitProjectChange("palette-to-fixtures",(draft)=>{draft.fixtures=draft.fixtures.map((fixture)=>ids.has(fixture.id)?({ ...fixture, properties:{ ...fixture.properties, red:rgb.r, green:rgb.g, blue:rgb.b } }):fixture);}); updateRendererFromFixtures(); status=`${selected().hex} applied to ${sceneFixtures().length} virtual fixture(s).`; }
function createCueSnapshot() {
  try {
    const timing={};
    for (const [key,fallback] of [["duration",5],["fade",1],["delay",0],["fadeOut",0]]) {
      const input=document.querySelector(`#cue-${key}`);
      if (input && (!input.value.trim() || !input.checkValidity())) throw new Error(`${t(key)}: enter a valid value.`);
      timing[key]=input ? Number(input.value) : fallback;
    }
    let cue;
    const groupId=document.querySelector("#cue-group").value;
    commitProjectChange("cue-create",(draft)=>{const sceneCueList=sceneCues(draft.cues,preferences.sceneId,draft.scenes);cue=createCue(groupFixtures(sceneFixtures(draft.fixtures,preferences.sceneId,draft.scenes),draft.fixtureGroups ?? [],groupId),{name:`Look ${sceneCueList.length+1}`,sceneId:preferences.sceneId,...timing});draft.cues=[...draft.cues,cue];});
    status=`${cue.name} captured with ${cue.targets.length} fixture target(s).`;
    render();
  } catch(error) { document.querySelector("#status").textContent=status=error.message; }
}
function currentRendererFixtures() { return sceneFixtures().map((fixture)=>({...fixture,selected:fixture.id===selectedFixture()?.id})); }
function updateRendererFromFixtures() { const fixtures=currentRendererFixtures();renderer?.setFixtures(fixtures);rendererFixtureSignature=lightLabFixtureState(fixtures); }
function updateDmxFeedback(fixtures) {
  const snapshot=virtualDmxPreview(fixtures,preferences.fixtureId);
  const monitor=document.querySelector("#virtual-dmx-monitor"),summary=document.querySelector(".timeline .dmx-actions span");
  if (monitor) {
    const channels=monitor.querySelector(".virtual-dmx-channels");
    if(channels){
      channels.replaceChildren();
      for(const channel of snapshot.channels){
        const item=document.createElement("span"),address=document.createElement("b"),name=document.createElement("span"),value=document.createElement("strong");
        item.className="virtual-dmx-channel";address.textContent=String(channel.address).padStart(3,"0");name.textContent=channel.name;value.textContent=String(channel.value);item.append(address,name,value);channels.append(item);
      }
      if(!snapshot.channels.length){const empty=document.createElement("span");empty.className="virtual-dmx-empty";empty.textContent=t("noFixtures");channels.append(empty);}
    }
    const universe=document.querySelector("#virtual-dmx-monitor header");
    if(universe)universe.textContent=`${t("universe")} ${snapshot.universe} · ${t("simulationOnly")} · ${t("outputDisabled")}`;
  }
  if (summary) summary.textContent=`U${snapshot.universe} · CH 1: ${snapshot.frame[0]} · ${t("outputDisabled")}`;
}
function previewFixtures(fixtures) {renderer?.setFixtures(fixtures);updateDmxFeedback(fixtures);}
function stopPlayback(message="Cue playback stopped.") { if(playbackTimer){clearInterval(playbackTimer);playbackTimer=null;} playbackClock=null; status=message; }
function togglePlaybackPause() {
  if (!playbackClock) return;
  if (playbackClock.paused) playbackClock.resume(performance.now());
  else playbackClock.pause(performance.now());
  const button=document.querySelector("#pause-playback");
  button.textContent=playbackClock.paused ? "▶" : "Ⅱ";
  button.title=t(playbackClock.paused ? "resumePlayback" : "pausePlayback");
  button.setAttribute("aria-label",button.title);
  button.setAttribute("aria-pressed",String(playbackClock.paused));
}
function playEffect() {
  const input=document.querySelector("#effect-period");
  if (!input.value.trim() || !input.checkValidity()) return input.reportValidity();
  const settings={type:document.querySelector("#effect-type").value,period:Number(input.value)};
  if (settings.type==="panTilt") { settings.minimum=64;settings.maximum=192; }
  const source=structuredClone(sceneFixtures());
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
function playLatestCue() {
  const sceneCueList=sceneCues(),cue=sceneCueList.find((item)=>item.id===preferences.cueId) ?? sceneCueList.at(-1);
  if (!cue) return;
  stopPlayback();
  const source=structuredClone(sceneFixtures());
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
  const sceneCueList=sceneCues();if (!sceneCueList.length) return;
  stopPlayback();
  const source=structuredClone(sceneFixtures()),cues=structuredClone(sceneCueList),duration=arrangementDuration(cues);
  playbackClock=createPlaybackClock(performance.now());preferences.view="light";
  playbackClock.seek(seek,performance.now());
  if (paused) playbackClock.pause(performance.now());
  playbackTimer=setInterval(()=>{
    if(document.querySelector(".arrangement-timeline .timeline-ruler")?.dataset.seeking)return;
    const position=playbackPosition(playbackClock.elapsed(performance.now()),duration,Boolean(preferences.loopSequence));
    previewFixtures(evaluateTracks(source,cues,position.time));
    document.querySelector("#arrangement-playhead").style.left=`${position.time/Math.max(30,duration)*100}%`;
    document.querySelector(".arrangement-timeline .timeline-ruler").setAttribute("aria-valuenow",String(position.time));
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
  requestWorkspaceReplacement(()=>{
    stopPlayback();
    undoStack=[structuredClone(project)];
    redoStack=[];
    project=next;
    activeSavedProjectId=null;
    projectPersisted=false;
    projectDirty=true;
    status=t("unsavedChanges");
    render();
  });
}
async function importNativeProject(file) {
  const result=await readProjectFile(file);
  if(!result.valid) return setStatus(result.errors.join(" "));
  requestWorkspaceReplacement(()=>{
    stopPlayback();
    project=prepareEditorProject(result.project);
    activeSavedProjectId=null;
    projectPersisted=false;
    projectDirty=true;
    undoStack=[];redoStack=[];
    status=t("unsavedChanges");
    render();
  });
}
function readSavedProjects() {
  const stored=safeParse(readBrowserStorage(savedProjectsKey).value);
  return Array.isArray(stored.projects) ? stored.projects.filter((item)=>item?.id && validateProject(item.project).valid) : [];
}
function makeProjectDialog(title,content) {
  const dialog=document.createElement("dialog");
  dialog.className="project-dialog";
  dialog.setAttribute("aria-labelledby","project-dialog-title");
  dialog.innerHTML='<form method="dialog" class="project-dialog-card"><header><h2 id="project-dialog-title">'+esc(title)+'</h2><button type="button" class="project-dialog-close" aria-label="'+esc(t("close"))+'">×</button></header>'+content+'</form>';
  document.body.append(dialog);
  dialog.querySelector(".project-dialog-close").onclick=()=>{dialog.close();dialog.remove();};
  return dialog;
}
function showRoomSceneDialog() {
  const options=roomPresetOptions(preferences.locale);
  const dialog=makeProjectDialog(t("addRoomScene"),'<label class="project-dialog-field">'+esc(t("chooseRoomTemplate"))+'<select id="room-template" required>'+options.map(item=>'<option value="'+esc(item.id)+'">'+esc(item.label)+'</option>').join("")+'</select></label><div class="project-dialog-actions"><button type="button" data-cancel>'+esc(t("cancel"))+'</button><button type="submit" id="create-room-scene">＋ '+esc(t("addRoomScene"))+'</button></div>');
  const form=dialog.querySelector("form");
  dialog.querySelector("[data-cancel]").onclick=()=>{dialog.close();dialog.remove();};
  form.onsubmit=(event)=>{event.preventDefault();const presetId=dialog.querySelector("#room-template").value;const roomScene=createRoomScene(presetId,{name:roomPresetName(presetId,preferences.locale)});commitProjectChange("scene-create",(draft)=>{const seeded=createRoomStarterLighting(roomScene,draft.fixtures,0);draft.scenes.push(seeded.scene);draft.fixtures=seeded.fixtures;});preferences.sceneId=roomScene.id;preferences.objectId=null;preferences.view="light";savePreferences();status=t("roomSceneAdded");dialog.close();dialog.remove();render();};
  dialog.addEventListener("cancel",()=>dialog.remove(),{once:true});
  dialog.showModal();
  dialog.querySelector("#room-template").focus();
}
function showSaveDialog(onSave) {
  const dialog=makeProjectDialog(t("saveProjectTitle"),'<label class="project-dialog-field">'+esc(t("projectName"))+'<input id="saved-project-name" maxlength="120" required value="'+esc(project.name)+'" /></label><div class="project-dialog-actions"><button type="button" data-cancel>'+esc(t("cancel"))+'</button><button type="submit">'+esc(t("save"))+'</button></div>');
  const form=dialog.querySelector("form"),input=dialog.querySelector("#saved-project-name");
  dialog.querySelector("[data-cancel]").onclick=()=>{dialog.close();dialog.remove();};
  form.onsubmit=(event)=>{event.preventDefault();const name=input.value.trim();if(!name){input.focus();return;}dialog.close();dialog.remove();onSave(name);};
  dialog.addEventListener("close",()=>dialog.remove(),{once:true});
  dialog.showModal();input.focus();input.select();
}
function persistProject(name) {
  const projectCopy=structuredClone(project);
  projectCopy.name=name;
  projectCopy.updatedAt=new Date().toISOString();
  const records=readSavedProjects();
  const id=activeSavedProjectId || (globalThis.crypto?.randomUUID?.() ?? ("saved-"+Date.now()+"-"+Math.random().toString(36).slice(2)));
  const next=[...records.filter((record)=>record.id!==id),{id,name,updatedAt:projectCopy.updatedAt,project:projectCopy}];
  if(!writeBrowserStorage(savedProjectsKey,JSON.stringify({projects:next})).ok){projectPersisted=false;status=t("storageUnavailable");render();return false;}
  project=prepareEditorProject(projectCopy);
  activeSavedProjectId=id;
  projectPersisted=true;
  projectDirty=false;
  status=t("projectSaved");
  return true;
}
function saveProject(onSaved) {
  const save=(name)=>{if(persistProject(name)){render();onSaved?.();}};
  if(activeSavedProjectId){const current=readSavedProjects().find((record)=>record.id===activeSavedProjectId);if(current){save(current.name);return;}}
  showSaveDialog(save);
}
function showSavedProjectsDialog() {
  const records=readSavedProjects();
  const entries=records.length ? records.map((record)=>'<button type="button" class="saved-project-entry" data-open-saved="'+esc(record.id)+'"><strong>'+esc(record.name)+'</strong><small>'+esc(record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "")+'</small></button>').join("") : '<p class="project-dialog-empty">'+esc(t("savedProjectsEmpty"))+'</p>';
  const dialog=makeProjectDialog(t("openProject"),'<div class="saved-project-list">'+entries+'</div><div class="project-dialog-actions"><button type="button" data-import>'+esc(t("importProject"))+'</button><button type="button" data-cancel>'+esc(t("cancel"))+'</button></div>');
  dialog.querySelector("[data-cancel]").onclick=()=>{dialog.close();dialog.remove();};
  dialog.querySelector("[data-import]").onclick=()=>{dialog.close();dialog.remove();document.querySelector("#project-file")?.click();};
  dialog.querySelectorAll("[data-open-saved]").forEach((button)=>button.onclick=()=>{
    const record=records.find((item)=>item.id===button.dataset.openSaved);
    if(!record)return;
    dialog.close();dialog.remove();
    requestWorkspaceReplacement(()=>{
      stopPlayback();
      project=prepareEditorProject(record.project);
      activeSavedProjectId=record.id;
      projectPersisted=true;
      projectDirty=false;
      undoStack=[];redoStack=[];
      preferences.fixtureId ??= project.fixtures.at(-1)?.id;
      status=t("projectOpened");
      render();
    });
  });
  dialog.addEventListener("close",()=>dialog.remove(),{once:true});
  dialog.showModal();
}
function requestWorkspaceReplacement(continueAction) {
  if(!projectDirty){continueAction();return;}
  const dialog=makeProjectDialog(t("unsavedChangesTitle"),'<p class="project-dialog-message">'+esc(t("unsavedChangesBody"))+'</p><div class="project-dialog-actions"><button type="button" data-cancel>'+esc(t("cancel"))+'</button><button type="button" data-discard>'+esc(t("discardChanges"))+'</button><button type="button" data-save>'+esc(t("saveAndContinue"))+'</button></div>');
  const finish=(choice)=>{dialog.close();dialog.remove();if(choice==="discard"){projectDirty=false;projectPersisted=false;continueAction();}else if(choice==="save")saveProject(continueAction);};
  dialog.querySelector("[data-cancel]").onclick=()=>finish("cancel");
  dialog.querySelector("[data-discard]").onclick=()=>finish("discard");
  dialog.querySelector("[data-save]").onclick=()=>finish("save");
  dialog.addEventListener("cancel",(event)=>{event.preventDefault();finish("cancel");},{once:true});
  dialog.addEventListener("close",()=>dialog.remove(),{once:true});
  dialog.showModal();
}
function createNewProject() {
  requestWorkspaceReplacement(()=>{
    stopPlayback();
    const locale=preferences.locale,theme=preferences.theme;
    for (const key of Object.keys(preferences)) delete preferences[key];
    Object.assign(preferences,defaults,{locale,theme,sceneId:"studio-room"});
    project=createStudioMoodProject();
    preferences.fixtureId=project.fixtures.at(-1)?.id;
    activeSavedProjectId=null;
    projectPersisted=false;
    projectDirty=false;
    undoStack=[];redoStack=[];
    savePreferences();
    status=t("newWorkspaceReady");
    render();
  });
}
function savePreferences() { if (!writeBrowserStorage(preferencesKey,JSON.stringify(preferences)).ok) status=t("preferencesNotSaved"); }
function updateUnsavedStatus() {
  projectDirty=true;
  projectPersisted=false;
  status=t("unsavedChanges");
}
function commitProjectChange(label, mutate) { stopPlayback(); const customizesLook=label.startsWith("fixture-")||label==="scene-room-settings"||label==="scene-material"||label==="palette-to-fixtures"; const next=commitTransaction({project,undoStack,redoStack},label,(draft)=>{mutate(draft);if(customizesLook){const active=draft.scenes.find(item=>item.id===preferences.sceneId);if(active&&isRoomLightingLookIndex(active.lightingLookIndex))active.lightingLookCustomized=true;}}); const validation=validateProject(next.project); if (!validation.valid) throw new Error(validation.errors.join(" ")); project=next.project;undoStack=next.undoStack;redoStack=next.redoStack;updateUnsavedStatus(); }
function mutateColours(fn) { commitProjectChange("palette-update",(draft)=>{draft.palettes[0].colors=fn(structuredClone(draft.palettes[0].colors));}); render(); }
function undo() { if (!undoStack.length) return setStatus(t("noUndo")); stopPlayback(); const next=undoTransaction({project,undoStack,redoStack});project=next.project;undoStack=next.undoStack;redoStack=next.redoStack;updateUnsavedStatus();status=t("statusUndo");render(); }
function redo() { if (!redoStack.length) return setStatus(t("noRedo")); stopPlayback(); const next=redoTransaction({project,undoStack,redoStack});project=next.project;undoStack=next.undoStack;redoStack=next.redoStack;updateUnsavedStatus();status=t("statusRedo");render(); }
function setStatus(value) { status = value; render(); }
function disabled(title) { return `disabled title="${esc(title)}"`; }
function compact(value, digits = 1) { return Number(value).toFixed(digits); }
function colourSpaceMarkup(hex) { const rgb=hexToRgb(hex),hsl=rgbToHsl(rgb),hsv=rgbToHsv(rgb),lab=rgbToLab(rgb),oklab=rgbToOklab(rgb); return `<section class="colour-space-card" aria-label="${t("colorSpaces")}"><h3>${t("colorSpaces")}</h3><dl><div><dt>sRGB</dt><dd>${Math.round(rgb.r)},${Math.round(rgb.g)},${Math.round(rgb.b)}</dd></div><div><dt>HSL</dt><dd>${compact(hsl.h)}°·${compact(hsl.s*100)}%·${compact(hsl.l*100)}%</dd></div><div><dt>HSV</dt><dd>${compact(hsv.h)}°·${compact(hsv.s*100)}%·${compact(hsv.v*100)}%</dd></div><div><dt>CIELAB</dt><dd>${compact(lab.l)},${compact(lab.a)},${compact(lab.b)}</dd></div><div><dt>OKLab</dt><dd>${compact(oklab.l,3)},${compact(oklab.a,3)},${compact(oklab.b,3)}</dd></div></dl><small class="${isSrgbGamut(rgb)?"pass":"fail"}">${isSrgbGamut(rgb)?t("inSrgb"):t("outsideSrgb")}</small></section>`; }
function fixtureLibraryMarkup() { return fixtureProfiles.map((profile)=>`<article><b>${esc(profile.model)}</b><small>${esc(profile.type)} · ${profile.modes[0].channels.length} CH</small><p>${esc(profile.validationStatus)} · ${esc(profile.provenance)}</p><button data-profile="${profile.id}">${t("addToVirtualPatch")}</button></article>`).join(""); }
function selectedFixture() { const fixtures=sceneFixtures();return fixtures.find((fixture)=>fixture.id===preferences.fixtureId) ?? fixtures[0]; }
function fixtureInspectorMarkup() { const fixture=selectedFixture();if(!fixture)return "";const fixtures=sceneFixtures(),patch=fixture.patchAssignment ?? {universe:1,startAddress:1}; return `<section class="fixture-inspector"><h3>${t("virtualFixture")}</h3><label>${t("fixtureLabel")}<select id="fixture-select">${fixtureOptions(fixtures,fixture.id)}</select></label><label>${t("colourName")}<input id="fixture-name" value="${esc(fixture.name)}" /></label>${fixturePlacementMarkup(fixture.transform,t("fixturePlacement"),t("fixtureDragHint"))}<div class="fixture-grid"><label>${t("universe")}<input id="fixture-universe" type="number" min="1" value="${patch.universe}" /></label><label>${t("startAddress")}<input id="fixture-address" type="number" min="1" max="512" value="${patch.startAddress}" /></label><label>${t("dimmer")}<input id="fixture-dimmer" type="number" min="0" max="255" value="${fixture.properties.dimmer ?? 0}" /></label><label>${t("beam")}<input id="fixture-beam" type="number" min="0" max="255" value="${fixture.properties.beam ?? 0}" /></label></div><button id="apply-fixture" class="wide inspector-icon-action" type="button" aria-label="${t("applyFixtureProperties")}" title="${t("applyFixtureProperties")}">✓</button></section>`; }
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
  const previousShell = document.querySelector(".studio-shell");
  const studioScrollTop = previousShell?.dataset.projectId === project.id ? previousShell.scrollTop : 0;
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
  const currentRoom=scene().room,roomCameraKey=JSON.stringify({room:currentRoom,roomType:scene().roomType});
  if(viewportCameraRoomKey&&viewportCameraRoomKey!==roomCameraKey){const dimensions=roomDimensions(currentRoom);viewportCamera={...normalizeCameraState(viewportCamera),distance:roomFitCameraDistance(dimensions.width,dimensions.depth)};}
  viewportCameraRoomKey=roomCameraKey;
  document.documentElement.lang = preferences.locale;
  document.documentElement.dataset.theme = preferences.theme;
  const active = selected();
  const activeFixtures=sceneFixtures();
  const displayedSceneNumber=Math.max(1,project.scenes.findIndex((item)=>item.id===scene().id)+1);
  const contrastBackground=normalizeHex(preferences.contrastBackground) ?? "#0B1220";
  const contrast = contrastResult(compositeSwatch(active,contrastBackground), contrastBackground);
  const colourSpaces = colourSpaceMarkup(active.hex);
  const room=roomDimensions(scene().room),ambience=roomAmbience(scene()),roomName=roomPresetName(scene().roomType,preferences.locale),stage=stageSettings(scene().stage),lookIndex=isRoomLightingLookIndex(scene().lightingLookIndex)?scene().lightingLookIndex:0,lightingLook=roomLightingLooks[lookIndex],lookButtonLabel=`${t("cycleLightingLook")} ${String(lookIndex+1).padStart(2,"0")}/${roomLightingLooks.length} · ${lightingLook.name}${scene().lightingLookCustomized?` · ${t("custom")}`:""}`;
  const commandGroups={project:t("project"),history:t("commandHistory"),scene:t("sceneHeader"),palette:t("commandPalette"),fixtures:t("commandFixtures"),stage:t("stageCommand"),room:t("roomCommand"),export:t("commandExport"),guide:t("commandHelp")};
  const nav = [
    ["palette", "◉", "moduleDesign"], ["light", "☼", "moduleStudio"], ["library", "▱", "moduleFixtures"], ["copilot", "◌", "moduleCopilot"]
  ].map(([key, icon, labelKey]) => `<button type="button" class="module ${studioActiveModule(preferences) === key ? "is-active" : ""}" data-module="${key}" aria-pressed="${studioActiveModule(preferences) === key}"><span>${icon}</span>${t(labelKey)}</button>`).join("");
  const commandMenuContent={
    project:`<button type="button" id="new-project">＋ ${t("newProject")}</button><button type="button" id="open-project">${t("openProject")}</button><button type="button" id="save">${t("save")}</button><button type="button" id="import-project">${t("importProject")}</button><button type="button" id="import-image" title="${t("importImage")}" aria-label="${t("importImage")}">${t("importAction")}</button><input id="project-file" type="file" accept="application/json,.json" hidden />`,
    history:`<button type="button" id="undo" ${undoStack.length ? "" : "disabled"}>↶ ${t("undo")}</button><button type="button" id="redo" ${redoStack.length ? "" : "disabled"}>↷ ${t("redo")}</button>`,
    scene:`<button type="button" id="add-room-scene">＋ ${t("addRoomScene")}</button><label class="preview-quality">${t("previewQuality")} <select id="preview-quality" ${preferences.view==="light" ? "" : disabled(t("select3d"))}>${Object.keys(previewQualities).map((key)=>`<option value="${key}" ${key===(preferences.previewQuality ?? "balanced") ? "selected" : ""}>${t(`quality_${key}`)}</option>`).join("")}</select></label><button type="button" id="reset-camera">${t("resetCamera")}</button>`,
    stage:`<fieldset class="scene-menu-fields" data-menu-keep-open><legend>${t("stagePlatform")}</legend><label class="scene-menu-check"><input id="stage-enabled" type="checkbox" ${stage.enabled ? "checked" : ""}> ${t("showStage")}</label>${["x","y","z","width","height","depth"].map((key)=>`<label>${["x","y","z"].includes(key) ? key.toUpperCase() : t(key)} (m)<input id="stage-${key}" type="number" step="any" required value="${stage[key]}"></label>`).join("")}<label class="scene-menu-colour">${t("selectedColour")}<input id="stage-color" type="color" value="${stage.color}"></label></fieldset><button type="button" id="apply-stage">${t("applyStageSettings")}</button>`,
    room:`<fieldset class="scene-menu-fields" data-menu-keep-open><legend>${t("roomDimensions")}</legend><p class="room-type-label">${t("roomType")}: ${esc(roomName)}</p>${["width","height","depth"].map((key)=>`<label>${t(key)} (m)<input id="room-${key}" type="number" required min="2" max="${key==="height" ? 20 : 50}" step="any" value="${room[key]}"></label>`).join("")}<label class="scene-menu-colour">${t("ambientFill")}<input id="room-ambience-color" type="color" value="${ambience.color}"></label><label class="scene-menu-range">${t("ambientLevel")} · ${Math.round(ambience.intensity*100)}%<input id="room-ambience-level" type="range" min="0" max="100" step="1" value="${Math.round(ambience.intensity*100)}"></label></fieldset><button type="button" id="apply-room">${t("applyRoomDimensions")}</button>`,
    palette:`<button type="button" data-menu-keep-open id="open-versions" aria-expanded="false">${t("versions")}</button><button type="button" data-menu-keep-open id="open-compare" aria-expanded="false">${t("compare")}</button>`,
    fixtures:`<button type="button" id="add-fixture">＋ ${t("addWash")}</button><button type="button" id="apply-fixture-colour">${t("applySwatchToFixtures")}</button>`,
    export:`<button data-export="project">Project JSON</button><button data-export="palette">Palette JSON</button><button data-export="css">CSS variables</button><button id="export-svg">Palette SVG</button><button data-raster="image/png">Palette PNG</button><button data-raster="image/jpeg">Palette JPEG</button><button id="export-pdf" aria-describedby="pdf-export-limit">${t("paletteSheetPdf")}</button><small id="pdf-export-limit">${t("pdfPaletteLimit")}</small><button id="export-tokens">${t("designTokens")}</button><button data-export="ase" title="${t("aseExportLimit")}">${t("aseExport")}</button><button data-export="patch">Patch CSV</button><button data-export="cues">Cue CSV</button><button id="export-cue-pdf" aria-describedby="cue-pdf-limit">${t("cueSheetPdf")}</button><small id="cue-pdf-limit">${t("cuePdfLimit")}</small>`,
    guide:`<input id="guide-search" type="search" placeholder="${t("guideSearchPlaceholder")}" aria-label="${t("guideSearchPlaceholder")}" data-menu-keep-open><div class="guide-sections">${helpGuideMarkup(preferences.locale,t)}</div>`
  };
  const commandMenusMarkup=`<div class="command-menu-system" aria-label="${t("tools")}">${Object.entries(commandGroups).map(([key,label])=>`<div class="command-menu" data-command-menu="${key}"><button type="button" class="command-menu-trigger" data-command-menu-trigger="${key}" aria-haspopup="dialog" aria-expanded="false" aria-controls="command-menu-panel-${key}">${label} <span aria-hidden="true">⌄</span></button><div id="command-menu-panel-${key}" class="command-group command-menu-panel" data-command-group="${key}" popover="auto" role="dialog" aria-label="${label}"><span>${label}</span>${commandMenuContent[key]}</div></div>`).join("")}</div>`;
  const compactToolLabelKeys={paletteBrush:"brushShort",fixture:"fixtureShort",material:"materialShort",orbit:"orbitShort"};
  const tools = [["select","↖"],["paletteBrush","◉"],["fixture","☀"],["material","◆"],["shapes","□"],["text","T"],["measure","⌗"],["orbit","◎"]].map(([key, icon]) => `<button type="button" class="tool ${preferences.tool === key ? "is-active" : ""}" data-tool="${key}" aria-label="${esc(t(key))}" title="${esc(t(key))}"><span aria-hidden="true">${icon}</span>${esc(t(compactToolLabelKeys[key] ?? key))}</button>`).join("");
  const swatches = palette().colors.map((swatch)=>swatchButton(swatch,active.id)).join("");
  const patchedFixtures = activeFixtures.filter((fixture) => fixture.patchAssignment);
  const virtualFrame = dmxFrame(activeFixtures);
  const sceneCueList=sceneCues(),activeCue=sceneCueList.find((cue)=>cue.id===preferences.cueId) ?? sceneCueList.at(-1);
  const timeline=timelineLayout(sceneCueList);
  const cueBlocks = `<div class="timeline-scale"><div class="timeline-ruler">${timeline.ticks.map((tick)=>`<span style="left:${tick.left}%">${Number(tick.time.toFixed(1))}s</span>`).join("")}</div><div class="timeline-lane">${sceneCueList.map((cue,index) => `<button type="button" class="cue-block" data-cue="${esc(cue.id)}" aria-pressed="${cue.id===activeCue?.id}" title="${esc(cue.name)} · ${cue.duration}s" style="left:${timeline.segments[index].left}%;width:${timeline.segments[index].width}%">${esc(cue.name)} · ${cue.duration}s</button>`).join("") || `<small class="empty-cues">${t("noCues")}</small>`}</div><div id="timeline-playhead" class="timeline-playhead" aria-hidden="true"></div></div>`;
  app.innerHTML = `
    <section id="top" class="marketing-home">
      <header class="marketing-header"><a class="marketing-brand" href="#top" aria-label="AdigunLightDesign home"><img src="./assets/corporate/hephzibah-behulah-official.jpg" alt="Hephzibah Behulah"><span><b>Adigun<span>Light</span>Design</b><small>HB Elektroniker · Color + Light Studio</small></span></a><a class="marketing-cta" href="#AdigunStudio">Go to the Studio <span aria-hidden="true">→</span></a></header>
      <main class="marketing-main">
        <section class="marketing-hero"><div class="marketing-copy"><p class="marketing-eyebrow"><i></i> LIGHTING DESIGN, MADE VISIBLE</p><h1>Design color.<br><em>Shape light.</em><br>Create atmosphere.</h1><p class="marketing-lede">Plan a room, place virtual fixtures, build a palette and see your lighting ideas come together in an interactive studio.</p><div class="marketing-actions"><a class="marketing-cta marketing-cta-primary" href="#AdigunStudio">Open the studio <span aria-hidden="true">→</span></a><a class="marketing-link" href="#about-product">Discover the workspace <span aria-hidden="true">↓</span></a></div><div class="marketing-proof"><span>01 <b>DESIGN</b></span><span>02 <b>PREVISUALIZE</b></span><span>03 <b>REFINE</b></span></div></div>
          <div class="marketing-visual" role="img" aria-label="Stylized living-room lighting concept in blue, amber and magenta"><div class="visual-glow visual-glow-blue"></div><div class="visual-glow visual-glow-amber"></div><div class="visual-frame"><div class="visual-topline"><span><i></i> ILLUSTRATIVE LIGHTING STUDY</span><b>ROOM · 01</b></div><div class="visual-room"><div class="visual-ceiling"></div><div class="visual-backwall"><span></span><span></span><span></span></div><div class="visual-sidewall"><div class="visual-window"></div></div><div class="visual-floor"></div><div class="visual-beam beam-a"></div><div class="visual-beam beam-b"></div><div class="visual-beam beam-c"></div><div class="visual-sofa"><i></i><i></i></div><div class="visual-table"></div><div class="visual-lamp"></div></div><div class="visual-caption"><span>COLOR · FORM · ATMOSPHERE</span><b><i></i> 3D STUDIO</b></div></div><div class="visual-tag tag-top">COLOR · FORM · MOOD</div><div class="visual-tag tag-bottom"><span></span> Explore light in a room</div></div></section>
        <section id="about-product" class="marketing-intro"><p class="marketing-eyebrow">A CREATIVE WORKSPACE BY HEPHZIBAH BEHULAH</p><h2>From a first idea to a room full of feeling.</h2><p>AdigunLightDesign brings color exploration and lighting previsualization into one practical workspace. Shape a room, explore lighting looks, arrange virtual fixtures, build color harmonies and organize cues before you take a design further.</p></section>
        <section class="marketing-capabilities" aria-label="Studio capabilities"><article><span>01 / COLOR</span><h3>Build a palette with purpose</h3><p>Explore harmonies, inspect color values and apply swatches to room surfaces and virtual fixtures.</p></article><article><span>02 / SPACE</span><h3>See light in context</h3><p>Work with room scenes, materials, fixture placement and camera views in an interactive 3D preview.</p></article><article><span>03 / CONTROL</span><h3>Arrange the lighting</h3><p>Patch virtual fixtures, shape DMX cues and review timing in the studio timeline.</p></article></section>
        <section class="marketing-bottom"><div><p class="marketing-eyebrow">YOUR NEXT IDEA STARTS HERE</p><h2>Bring the room to life.</h2></div><a class="marketing-cta marketing-cta-primary" href="#AdigunStudio">Go to the Studio <span aria-hidden="true">→</span></a></section>
      </main><footer class="marketing-footer"><span>HEPHZIBAH BEHULAH <i>·</i> HB ELEKTRONIKER <i>·</i> ADIGUNLIGHTDESIGN</span><span>Design Color. Shape Light. Create Atmosphere.</span></footer>
    </section>
    <div id="AdigunStudio" class="studio-shell" data-project-id="${esc(project.id)}">
    <header class="topbar">
      <a class="brand-lockup" href="#top" aria-label="${t("brandAlt")} — home">
        <img class="corporate-mark" src="./assets/corporate/hephzibah-behulah-official.jpg" alt="Hephzibah Behulah" onerror="this.hidden=true;this.nextElementSibling.hidden=false" />
        <span class="brand-fallback" hidden>HB <b>Hephzibah Behulah</b></span><span class="brand-divider"></span><span class="division">⚡ HB Elektroniker</span>
      </a>
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
        <section class="tool-section"><h2><button type="button" id="toggle-tools" class="tool-section-toggle" aria-haspopup="true" aria-expanded="false" aria-controls="tool-list"><span>☼ ${t("toolsOneClick")}</span><span class="tools-caret" aria-hidden="true">▾</span></button></h2><div id="tool-list" class="tool-list tool-popover" popover="auto">${tools}</div></section>
      </aside>
      <section class="work-area">
        <div class="workspace-tabs panel"><strong class="studio-panel-title">${preferences.view === "light" ? `${t("sceneHeader")} ${String(displayedSceneNumber).padStart(2,"0")} / ${scene().id === "studio-room" ? t("mockupRoomTitle") : esc(scene().name)}` : `2D ${t("palette")} / ${esc(project.name)}`}</strong><small class="studio-panel-title-meta">${preferences.view === "light" ? t("viewportFixedHint") : t("palette")}</small><span></span><button id="viewport-projection" class="view-menu" ${preferences.view === "light" ? "" : disabled(t("select3d"))}>${t("perspective")}⌄</button></div>
        ${preferences.view === "light" ? `<div class="scene-preview light-canvas panel"><div class="scene-title"><b>${esc(project.name)} • ${t("rgbwPreview")}</b><small>${t("sceneView")} • ${t("rgbwPreviewSubtitle")}</small></div><canvas id="light-canvas" tabindex="0" aria-label="${t("previewLabel")}"></canvas><div class="canvas-media-controls"><button id="cycle-lighting-look" class="lighting-look-toggle" type="button" title="${esc(lookButtonLabel)}" aria-label="${esc(lookButtonLabel)}"><span aria-hidden="true">◈</span>${t("lightingLook")} ${String(lookIndex+1).padStart(2,"0")}/${roomLightingLooks.length}${scene().lightingLookCustomized?` · ${t("custom")}`:""}</button><button id="play-room-tour" class="studio-media-button" type="button" aria-pressed="${renderer?.tourPlaying?.()??false}" title="${t("roomTourHelp")}" aria-label="${renderer?.tourPlaying?.()?t("stopRoomTour"):t("playRoomTour")}"><span aria-hidden="true">${renderer?.tourPlaying?.()?"■":"▶"}</span> ${renderer?.tourPlaying?.()?t("stopRoomTour"):t("playRoomTour")}</button><button id="toggle-room-music" class="studio-media-button" type="button" aria-pressed="${roomMusic.isPlaying()}" title="${t("roomMusicHelp")}" aria-label="${t("toggleRoomMusic")}"><span aria-hidden="true">♫</span> ${roomMusic.isPlaying()?t("pauseMusic"):t("playMusic")}</button><button id="open-room-music" class="studio-media-button studio-media-settings" type="button" popovertarget="room-music-panel" aria-label="${t("musicSettings")}" title="${t("musicSettings")}">⚙</button><div id="room-music-panel" class="room-music-panel" popover="auto"><label>${t("musicMood")}<select id="room-music-mood">${musicMoods.map(({id,labelKey})=>`<option value="${id}" ${preferences.roomMusicMood===id?"selected":""}>${t(labelKey)}</option>`).join("")}</select></label><label>${t("musicVolume")}<input id="room-music-volume" type="range" min="0" max="100" value="${Math.round(preferences.roomMusicVolume*100)}"></label></div></div><div class="canvas-actions"><button id="apply-scene">${t("paintSurface")}</button></div></div>` : `<div class="scene-preview panel" role="img" aria-label="${t("scenePreview")}"><div class="scene-title"><b>${t("scenePreview")}</b><small>${t("sceneNote")}</small></div><div class="beam beam-blue"></div><div class="beam beam-amber"></div><div class="beam beam-magenta"></div><div class="stage-truss"></div><div class="scene-wall"><div class="art-frame"></div><div class="couch"></div><div class="plant plant-left"></div><div class="plant plant-right"></div><div class="lamp"></div></div><div class="axis"><i>X</i><b>Y</b><em>Z</em></div></div>`}
        <div class="lower-workspace"><section class="palette-panel panel"><div class="section-title"><h2>◉ ${t("activePalette")} — ${esc(palette().name)}</h2></div><div class="swatches">${swatches}</div><div class="palette-actions"><input id="seed" value="${preferences.seed}" aria-label="Seed colour" maxlength="7" /><label class="harmony-command"><span>◇ ${t("harmonies")}</span><select id="harmony" aria-label="${t("harmony")}">${["analogous","complementary","splitComplementary","triadic","tetradic","square","monochromatic"].map((type) => `<option value="${type}" ${type === preferences.harmony ? "selected" : ""}>${type}</option>`).join("")}</select></label><button id="reroll">⟳ ${t("reroll")}</button><button id="add-colour">＋ ${t("add")}</button></div></section>
          <section class="timeline panel" tabindex="-1"><div class="section-title"><h2>◌ ${t("timeline")}</h2></div><p class="timeline-status">${activeFixtures.length ? `${t("universe")} 1 · ${patchedFixtures.length}/${activeFixtures.length} ${t("fixturesPatched")} · 1–${Math.max(0,...patchedFixtures.map((fixture)=>fixture.patchAssignment.startAddress+fixture.patchAssignment.channelFootprint-1))} ${t("activeChannels")}.` : t("noFixtures")}</p><div class="dmx-actions"><button id="create-cue" ${activeFixtures.length ? "" : "disabled"}>＋ ${t("captureCue")}</button><button id="play-cue" ${sceneCueList.length ? "" : "disabled"}>▶ ${t("previewSelectedCue")}</button><button id="stop-cue" ${playbackTimer ? "" : "disabled"}>■ ${t("stop")}</button><span>CH 1: ${virtualFrame[0]} · ${t("outputDisabled")}</span></div><div class="cue-track" aria-label="${t("timeline")}">${cueBlocks}</div></section></div>
      </section>
      <aside class="inspector panel"><div class="section-title"><h2>◈ ${t("inspector")}</h2></div><div class="inspector-tabs"></div><div class="selected-preview" style="--selected:${active.hex}"></div><label>${t("colourName")}<input id="swatch-name" value="${esc(active.name)}" /></label><label>${t("hex")}<div class="input-row"><input id="swatch-hex" value="${active.hex}" spellcheck="false" /><button id="apply-colour">${t("applySwatchColour")}</button></div></label><button id="lock-swatch" class="wide">${active.locked ? "⌁ " + t("unlock") : "⌁ " + t("lock")}</button><section class="contrast-card"><h3>${t("contrast")}</h3><b>${contrast.ratio.toFixed(2)} : 1</b><span class="${contrast.aa ? "pass" : "fail"}">AA ${contrast.aa ? "pass" : "review"}</span><small>Against Midnight Navy #0B1220</small></section></aside>
      <aside class="lux-panel panel ${preferences.luxOpen ? "" : "is-collapsed"}"><div class="lux-heading"><div><span class="lux-icon">✦</span><h2>${t("luxTitle")} ✨</h2></div><button id="toggle-lux" class="subtle" aria-label="${preferences.luxOpen ? t("closePanel") : t("openLux")}">${preferences.luxOpen ? "×" : "✦"}</button></div>${preferences.luxOpen ? `<p class="lux-subtitle">${t("luxSubtitle")}</p><div class="lux-message"><b>${t("luxBrand")} · ${t("offline")}</b><p>${t("luxUnavailable")}</p><ul><li>${t("luxLocal")}</li><li>${t("luxNoUpload")}</li></ul></div><form id="lux-form" class="lux-input"><input id="lux-question" placeholder="${t("askLux")}" aria-label="${t("askLux")}" /><button aria-label="${t("sendLux")}">➤</button></form>` : ""}</aside>
    </main>
    <footer class="studio-footer"><span class="footer-ready"><i aria-hidden="true">●</i> ${t("ready").toUpperCase()} · ${esc(project.name)} / ${t("sceneHeader")} ${String(displayedSceneNumber).padStart(2,"0")} · 3D / ${t("virtualDmx")} · ${t(projectPersisted ? "projectSavedShort" : "sessionOnly")}</span><span id="status" role="status" aria-live="polite">${status || t("footerControls")}</span><span class="footer-shortcuts">${t("keyboardShortcuts")}</span></footer></div>`;
  if(reuseRenderer)document.querySelector("#light-canvas")?.replaceWith(previousCanvas);
  const commandMenus=document.querySelector(".command-menu-system");
  for(const [group,ids] of [["history",["undo","redo"]]]){
    const host=commandMenus.querySelector(`[data-command-group="${group}"]`);
    for(const id of ids){const control=document.getElementById(id);if(control){host.append(control);control.classList.add("command-menu-item");}}
  }
  document.querySelector(".contrast-card").insertAdjacentHTML("beforebegin", colourSpaces);
  if (activeFixtures.length) document.querySelector(".selected-preview").insertAdjacentHTML("afterend", fixtureInspectorMarkup());
  if (preferences.module === "library") { const drawer=document.createElement("section"); drawer.className="library-drawer panel"; drawer.setAttribute("aria-label",t("library")); drawer.innerHTML=`<div class="section-title"><h2>▱ ${t("library")}</h2><button id="close-library" class="subtle" aria-label="${t("close")}">×</button></div><p>${t("virtualLibraryNote")}</p><div class="fixture-library">${fixtureLibraryMarkup()}</div>`; document.querySelector(".studio-shell").insertBefore(drawer,document.querySelector(".studio-footer")); }
  if (!activeCue) document.querySelector(".cue-track").insertAdjacentHTML("beforebegin", `<div class="cue-timing">${["duration","fade","delay"].map((key)=>`<label>${t(key)} (s)<input id="cue-${key}" type="number" required min="${key === "duration" ? ".1" : "0"}" step=".1" value="${key === "duration" ? "5" : key === "fade" ? "1" : "0"}" /></label>`).join("")}</div>`);
  if (activeCue) document.querySelector(".cue-track").insertAdjacentHTML("beforebegin", `<div class="cue-timing"><label>${t("timeline")}<input id="edit-cue-name" value="${esc(activeCue.name)}" /></label>${["duration","fade","delay"].map((key)=>`<label>${t(key)} (s)<input id="edit-cue-${key}" type="number" required min="0" step=".1" value="${activeCue[key] ?? 0}" /></label>`).join("")}<button id="edit-cue">${t("saveCueTiming")}</button></div>`);
  document.querySelector(".dmx-actions").insertAdjacentHTML("beforeend", `<button id="blackout" ${activeFixtures.length ? "" : "disabled"}>${t("blackout")}</button>`);
  const blackoutCommand=document.querySelector("#blackout"),fixtureCommandGroup=commandMenus.querySelector('[data-command-group="fixtures"]');
  if(blackoutCommand&&fixtureCommandGroup){fixtureCommandGroup.append(blackoutCommand);blackoutCommand.classList.add("command-menu-item");}
  document.querySelector("#stop-cue").insertAdjacentHTML("beforebegin", `<button id="pause-playback" aria-pressed="${Boolean(playbackClock?.paused)}" ${playbackTimer ? "" : "disabled"}>${t(playbackClock?.paused ? "resumePlayback" : "pausePlayback")}</button>`);
  const tracks=arrangeTracks(sceneCueList);
  const sequenceTrack=document.querySelector(".timeline > .cue-track");
  document.querySelector(".timeline > .section-title").insertAdjacentHTML("afterend",arrangementTimelineMarkup(sceneCueList,activeCue?.id,t("noCues")));
  sequenceTrack.remove();
  document.querySelector("#stop-cue").insertAdjacentHTML("beforebegin",`<button id="play-tracks" ${sceneCueList.length ? "" : "disabled"}>▶ ${t("playTracks")}</button>`);
  document.querySelector("#create-cue").insertAdjacentHTML("beforebegin", `<label>${t("captureGroup")} <select id="cue-group"><option value="">${t("allFixtures")}</option>${(project.fixtureGroups ?? []).map((group)=>`<option value="${esc(group.id)}">${esc(group.name)}</option>`).join("")}</select></label>`);
  document.querySelector(".timeline > .dmx-actions").prepend(document.querySelector(".timeline-status"));
  document.querySelector(".timeline").insertAdjacentHTML("beforeend", `<label class="timeline-loop" title="${t("loopSequence")}" aria-label="${t("loopSequence")}"><input id="sequence-loop" type="checkbox" ${preferences.loopSequence ? "checked" : ""}> ↻</label>`);
  document.querySelector(".timeline").insertAdjacentHTML("beforeend", `<div class="dmx-actions"><label>${t("virtualEffect")} <select id="effect-type"><option value="pulse">${t("pulse")}</option><option value="chase">${t("chase")}</option></select></label><label>${t("effectPeriod")} <input id="effect-period" type="number" min="0.1" max="120" step="0.1" value="2"></label><button id="play-effect" class="inspector-icon-action" type="button" aria-label="${t("previewEffect")}" title="${t("previewEffect")}" ${activeFixtures.length ? "" : "disabled"}>▶</button></div>`);
  if (activeCue) {
    const index=sceneCueList.indexOf(activeCue);
    const scheduled=tracks.flatMap((track)=>track.entries).find((entry)=>entry.cue.id===activeCue.id);
    document.querySelector("#edit-cue").insertAdjacentHTML("afterend", `<label>${t("trackName")}<input id="cue-track-name" maxlength="80" value="${esc(activeCue.trackId ?? "Main")}"></label><label>${t("startTime")}<input id="cue-start-time" type="number" min="0" step="0.1" required value="${scheduled.start}"></label><button id="schedule-cue">${t("scheduleCue")}</button>`);
    document.querySelector("#edit-cue").insertAdjacentHTML("afterend", `<button id="duplicate-cue">${t("duplicateCue")}</button><button id="delete-cue">${t("deleteCue")}</button>`);
    document.querySelector("#edit-cue").insertAdjacentHTML("afterend", `<button data-move-cue="-1" ${index === 0 ? "disabled" : ""}>← ${t("earlier")}</button><button data-move-cue="1" ${index === sceneCueList.length - 1 ? "disabled" : ""}>${t("later")} →</button>`);
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
  document.querySelector(".tool-section").insertAdjacentHTML("afterend", `<section class="fixture-list-section"><h2><button type="button" id="toggle-fixtures" class="fixture-list-toggle" aria-haspopup="true" aria-expanded="false" aria-controls="fixture-list">${t("fixtureList")} <span>${activeFixtures.length}</span><span aria-hidden="true">⌄</span></button></h2>${activeFixtures.length ? `<ul id="fixture-list" class="fixture-layer-list fixture-list-popover" aria-label="${t("layersLighting")}" popover="auto">${activeFixtures.map((fixture)=>`<li><button type="button" class="fixture-select" data-layer-fixture="${esc(fixture.id)}" aria-pressed="${fixture.id===selectedFixture()?.id}" title="${esc(fixture.name)}"><span aria-hidden="true">☼</span><span class="fixture-name">${esc(fixture.name)}</span></button><button type="button" class="fixture-delete" data-delete-fixture-row="${esc(fixture.id)}" aria-label="${esc(t("deleteFixture"))}: ${esc(fixture.name)}" title="${esc(t("deleteFixture"))}">×</button></li>`).join("")}</ul>` : `<p class="fixture-empty">${t("noFixtures")} · <button type="button" class="fixture-empty-add">＋ ${t("addWash")}</button></p>`}</section><section class="fixture-group-section"><h2><button type="button" id="toggle-fixture-groups" class="sidebar-menu-toggle" aria-haspopup="dialog" aria-expanded="false" aria-controls="fixture-groups">${t("fixtureGroups")} <span aria-hidden="true">⌄</span></button></h2><div id="fixture-groups" class="fixture-group-editor fixture-group-popover" popover="auto" role="dialog" aria-label="${t("fixtureGroups")}"></div></section><div class="palette-dock-slot"></div><section class="virtual-dmx-section"><h2><button type="button" id="toggle-virtual-dmx" class="sidebar-menu-toggle" aria-haspopup="dialog" aria-expanded="false" aria-controls="virtual-dmx-monitor">${t("virtualDmx")} <span class="dmx-output-state">· ${t("outputDisabled")}</span><span aria-hidden="true">⌄</span></button></h2><div id="virtual-dmx-monitor" class="virtual-dmx-monitor" popover="auto" role="dialog" aria-label="${t("virtualDmx")} · ${t("outputDisabled")}"><header>${t("universe")} 1 · ${t("simulationOnly")} · ${t("outputDisabled")}</header><div class="virtual-dmx-channels"></div></div></section>`);
  const dmxButton=document.querySelector("#toggle-virtual-dmx"),dmxSection=dmxButton?.closest(".virtual-dmx-section");
  if(dmxButton&&dmxSection){const title=document.createElement("h2");title.className="virtual-dmx-title";title.innerHTML=`${t("virtualDmx")} <span>· ${t("outputDisabled")}</span>`;dmxButton.closest("h2").replaceWith(title);const monitor=document.querySelector("#virtual-dmx-monitor");monitor.removeAttribute("popover");monitor.removeAttribute("role");monitor.classList.add("virtual-dmx-monitor-static");}
  document.querySelector("#fixture-groups").innerHTML=`<label class="group-name-field">${t("groupName")} <input id="group-name" maxlength="120"></label><div class="fixture-group-members">${activeFixtures.map((fixture)=>`<label title="${esc(fixture.name)}"><input type="checkbox" data-group-member value="${esc(fixture.id)}"> <span>${esc(fixture.name)}</span></label>`).join("")}</div><div class="fixture-group-actions"><button id="save-group" ${activeFixtures.length ? "" : "disabled"}>${t("saveGroup")}</button><button id="new-group">${t("newGroup")}</button></div><div class="saved-fixture-groups">${(project.fixtureGroups ?? []).map((group)=>`<p><b>${esc(group.name)}</b> · ${group.fixtureIds.filter((id)=>activeFixtures.some((fixture)=>fixture.id===id)).length} <button data-edit-group="${esc(group.id)}">${t("editGroup")}</button><button data-delete-group="${esc(group.id)}">${t("deleteGroup")}</button></p>`).filter((_,index)=>(project.fixtureGroups[index]?.fixtureIds ?? []).some((id)=>activeFixtures.some((fixture)=>fixture.id===id))).join("")}</div>`;
  document.querySelector(".swatches").insertAdjacentHTML("afterend", `<p class="palette-summary">${t("seedColour")}: ${esc(preferences.seed)} · ${t("harmony")}: ${esc(preferences.harmony)} · ${palette().colors.length} ${t("summarySwatches")} · ${palette().colors.filter((colour)=>colour.locked).length} ${t("summaryLocked")}</p>`);
  document.querySelector(".palette-actions").insertAdjacentHTML("beforeend", `<button id="extract-image">${t("extractImage")}</button><input id="palette-image" type="file" accept="image/png,image/jpeg,image/webp" hidden />`);
  const swatchIndex=palette().colors.indexOf(active);
  document.querySelector("#lock-swatch").insertAdjacentHTML("afterend", `<div class="palette-actions"><button data-move-swatch="-1" ${swatchIndex===0 ? "disabled" : ""}>← ${t("earlier")}</button><button data-move-swatch="1" ${swatchIndex===palette().colors.length-1 ? "disabled" : ""}>${t("later")} →</button><button id="remove-swatch" ${palette().colors.length<2 ? "disabled" : ""}>${t("removeColor")}</button></div>`);
  document.querySelector("#apply-colour").insertAdjacentHTML("afterend", `<button id="copy-hex">${t("copy")}</button>`);
  const hsl=rgbToHsl(hexToRgb(active.hex));
  document.querySelector("#lock-swatch").insertAdjacentHTML("beforebegin", `<section class="colour-space-card hsl-controls"><h3>HSL</h3>${[["hue",hsl.h,360,"H °"],["saturation",hsl.s*100,100,"S %"],["lightness",hsl.l*100,100,"L %"]].map(([key,value,max,label])=>`<label title="${t(key)}" aria-label="${t(key)}">${label}<input id="color-${key}" type="number" min="0" max="${max}" step="any" value="${compact(value,2)}" /></label>`).join("")}<button id="apply-hsl" class="wide">${t("apply")} HSL</button></section>`);
  const contrastCard=document.querySelector(".contrast-card");
  contrastCard.querySelector("small").textContent=contrastBackground;
  contrastCard.insertAdjacentHTML("beforeend", `<label>${t("contrastBackground")}<input id="contrast-background" type="color" value="${contrastBackground}" /></label><dl>${[["normalText","AA",contrast.aa],["normalText","AAA",contrast.aaa],["largeText","AA",contrast.largeAa],["largeText","AAA",contrast.largeAaa]].map(([key,level,pass])=>`<div><dt>${t(key)} ${level}</dt><dd class="${pass ? "pass" : "fail"}">${t(pass ? "passes" : "fails")}</dd></div>`).join("")}</dl>`);
  const contrastSuggestion=contrast.aa || (active.opacity ?? 1)<1 ? null : suggestContrast(active.hex,contrastBackground);
  if (contrastSuggestion) contrastCard.insertAdjacentHTML("beforeend", `<button id="apply-contrast" class="wide">${t("improveContrast")} ${contrastSuggestion}</button>`);
  const oklch=oklabToOklch(rgbToOklab(hexToRgb(active.hex)));
  document.querySelector("#lock-swatch").insertAdjacentHTML("beforebegin", `<section class="colour-space-card oklch-controls"><h3>OKLCH</h3>${[["l",oklch.l,1,"L"],["c",oklch.c,1,"C"],["h",oklch.h,360,"H"]].map(([key,value,max,label])=>`<label title="${key==="l"?t("lightness"):key==="c"?t("chroma"):t("hue")} (0–${max})" aria-label="${key==="l"?t("lightness"):key==="c"?t("chroma"):t("hue")} (0–${max})">${label}<input id="oklch-${key}" type="number" required min="0" max="${max}" step="any" value="${compact(value,4)}" /></label>`).join("")}<button id="apply-oklch" class="wide">${t("apply")} OKLCH</button></section>`);
  document.querySelector("#oklch-l").closest("label").firstChild.textContent="L";
  document.querySelector(".palette-panel").insertAdjacentHTML("beforeend", `<div id="palette-versions-menu" class="command-subpanel" hidden><div class="palette-actions"><button id="save-version">${t("saveVersion")}</button><select id="palette-version" aria-label="${t("savedVersions")}">${project.palettes.slice(1).map((item)=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("")}</select><button id="restore-version" ${project.palettes.length<2 ? "disabled" : ""}>${t("restoreVersion")}</button></div></div><div id="palette-compare-menu" class="command-subpanel" hidden><div id="version-comparison"></div></div>`);

  document.querySelector("#lock-swatch").insertAdjacentHTML("beforebegin", `<label>${t("opacity")} (%)<input id="swatch-opacity" type="number" required min="0" max="100" step="any" value="${(active.opacity ?? 1)*100}" /></label><button id="apply-opacity" class="wide">${t("setSwatchOpacity")}</button>`);
  for (const button of document.querySelectorAll("[data-swatch]")) {
    const swatch=palette().colors.find((item)=>item.id===button.dataset.swatch);
    button.querySelector("span").style.background=swatchCssColor(swatch);
  }
  document.querySelector(".selected-preview").style.background=swatchCssColor(active);
  document.querySelector(".palette-panel").insertAdjacentHTML("beforeend", `<div class="palette-actions"><label>${t("hueSpacing")}<input id="custom-spacing" type="number" min="-360" max="360" step="any" value="30" /></label><button id="custom-hues">${t("customHues")}</button><button id="perceptual-scale">${t("perceptualScale")}</button></div>`);
  const arrangementEnd=arrangementDuration(sceneCueList);
  document.querySelector(".palette-panel").insertAdjacentHTML("beforeend", `<div class="palette-actions"><label>${t("temperatureStrength")} (%)<input id="temperature-strength" type="number" min="0" max="100" step="1" required value="20"></label><button data-temperature="warm">${t("warmPalette")}</button><button data-temperature="cool">${t("coolPalette")}</button></div>`);
  document.querySelector(".palette-dock-slot").append(document.querySelector(".palette-panel"));
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
  if (preferences.view==="light") { const previewCountLabel=`${t("webglPreview")} · ${phrase("previewFixtureCount",{shown:scene().visibility?.lighting===false ? 0 : Math.min(activeFixtures.length,previewQuality(preferences.previewQuality).fixtures),total:activeFixtures.length})}`; const previewSubtitle=document.querySelector(".scene-title small"); previewSubtitle.title=previewCountLabel; previewSubtitle.setAttribute("aria-label",previewCountLabel); }
  projectionButton.insertAdjacentHTML("afterend", `<button id="export-canvas" class="view-menu" ${preferences.view==="palette" ? "" : "disabled"}>↗ ${t("exportCanvas")}</button>`);
  const materialButton=document.querySelector("#apply-scene");
  if (materialButton) materialButton.insertAdjacentHTML("beforebegin", `<label>${t("paintColon")} <select id="material-target">${["wall","wallRear","wallLeft","wallRight","accent","floor","ceiling"].map((target)=>`<option value="${target}" ${preferences.materialTarget===target ? "selected" : ""}>${t(`surface_${target}`)}</option>`).join("")}</select></label>`);
  projectionButton.insertAdjacentHTML("afterend", `<button id="export-viewport" class="view-menu" ${preferences.view==="light" ? "" : "disabled"}>▣ ${t("exportViewport")}</button>`);
  const projectionName=t(preferences.projection==="orthographic" ? "orthographic" : "perspective");
  const nextProjectionName=t(preferences.projection==="orthographic" ? "perspective" : "orthographic");
  projectionButton.textContent=preferences.projection==="orthographic" ? "▤" : "◉";
  projectionButton.setAttribute("aria-label",t("switchProjection"));
  projectionButton.setAttribute("aria-pressed",String(preferences.projection==="orthographic"));
  projectionButton.title=`${projectionName} · ${t("switchProjection")} ${nextProjectionName}`;
  document.querySelector("#effect-type").insertAdjacentHTML("beforeend", `<option value="panTilt">${t("panTilt")}</option>`);
  document.querySelector(".timeline > .dmx-actions").insertAdjacentHTML("beforeend", `<output id="arrangement-position">0 / ${arrangementEnd.toFixed(1)} s</output>`);
  const timelineTransport=document.createElement("div");
  timelineTransport.className="timeline-transport";
  const loopInput=document.querySelector("#sequence-loop"),loopLabel=loopInput?.closest("label");
  timelineTransport.append(document.querySelector("#create-cue"),document.querySelector("#play-tracks"),document.querySelector("#pause-playback"),document.querySelector("#stop-cue"),loopLabel,document.querySelector("#play-cue"));
  const timelineIcons=[["#create-cue","＋","captureCue"],["#play-tracks","▶","playTracks"],["#pause-playback",playbackClock?.paused ? "▶" : "Ⅱ",playbackClock?.paused ? "resumePlayback" : "pausePlayback"],["#stop-cue","■","stop"],["#play-cue","▷","previewSelectedCue"]];
  for(const [selector,glyph,label] of timelineIcons){const button=timelineTransport.querySelector(selector);if(button){button.textContent=glyph;button.title=t(label);button.setAttribute("aria-label",t(label));}}
  if(loopLabel){loopLabel.title=t("loopSequence");loopLabel.setAttribute("aria-label",t("loopSequence"));}
  document.querySelector(".timeline > .section-title").append(timelineTransport);
  const timelineBadge=document.querySelector(".timeline > .section-title .m-badge");if(timelineBadge)document.querySelector(".timeline > p").append(" ",timelineBadge);
  const timingDetails=document.createElement("section");
  if(!activeCue)document.querySelector("#cue-delay").parentElement.insertAdjacentHTML("afterend", `<label>${t("fadeOut")} (s)<input id="cue-fadeOut" type="number" min="0" step="0.1" required value="0"></label>`);
  if (activeCue) document.querySelector("#edit-cue-delay").parentElement.insertAdjacentHTML("afterend", `<label>${t("fadeOut")} (s)<input id="edit-cue-fadeOut" type="number" min="0" step="0.1" required value="${activeCue.fadeOut ?? 0}"></label><small>${t("holdTime")}: ${Math.max(0,activeCue.duration-(activeCue.delay ?? 0)-activeCue.fade-(activeCue.fadeOut ?? 0)).toFixed(1)} s</small>`);
  timingDetails.className="fixture-group-editor cue-editor";
  const cueEditorFields=document.createElement("div");cueEditorFields.className="cue-editor-fields";timingDetails.append(cueEditorFields);
  document.querySelectorAll(".cue-timing").forEach((node)=>cueEditorFields.append(node));
  if(activeCue){
    const cueTiming=cueEditorFields.querySelector(".cue-timing"),scheduleRow=document.createElement("div");scheduleRow.className="cue-schedule-row";
    for(const selector of ["#cue-track-name","#cue-start-time","#schedule-cue","[data-move-cue='-1']","[data-move-cue='1']","#duplicate-cue","#delete-cue"]){const control=cueTiming.querySelector(selector),item=control?.closest("label")??control;if(item)scheduleRow.append(item);}
    const headings=document.createElement("div"),values=document.createElement("div");headings.className="cue-timing-headings";values.className="cue-timing-values";
    const fieldOrder=["#edit-cue-name","#cue-track-name","#cue-start-time","#edit-cue-duration","#edit-cue-fade","#edit-cue-delay","#edit-cue-fadeOut"];
    for(const selector of fieldOrder){const input=(selector==="#cue-track-name"||selector==="#cue-start-time"?scheduleRow:cueTiming).querySelector(selector),label=input?.closest("label");if(!input||!label)continue;const name=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE)?.textContent.trim()??"";label.textContent=name;label.htmlFor=input.id;headings.append(label);values.append(input);}
    const hold=cueTiming.querySelector("small");if(hold){const label=document.createElement("label");label.textContent=t("holdTime");headings.append(label);values.append(hold);}
    for(const selector of ["#edit-cue","#schedule-cue","[data-move-cue='-1']","[data-move-cue='1']","#duplicate-cue","#delete-cue"]){const button=selector==="#edit-cue"?cueTiming.querySelector(selector):scheduleRow.querySelector(selector);if(button)values.append(button);}
    for(let index=0;index<6;index++){const spacer=document.createElement("span");spacer.setAttribute("aria-hidden","true");headings.append(spacer);}
    cueTiming.replaceChildren(headings,values);
    const timelineTitle=document.querySelector(".timeline > .section-title");
    cueTiming.classList.add("timeline-active-cue-editor");
    timelineTitle.replaceWith(cueTiming);
    document.querySelector(".timeline > .dmx-actions").insertAdjacentElement("afterend",timelineTitle);
    timingDetails.classList.add("cue-editor-fields-moved");
  }else{
    const cueTiming=cueEditorFields.querySelector(".cue-timing"),headings=document.createElement("div"),values=document.createElement("div");headings.className="cue-timing-headings";values.className="cue-timing-values";
    for(const key of ["duration","fade","delay","fadeOut"]){const input=cueTiming.querySelector(`#cue-${key}`),label=input?.closest("label");if(!input||!label)continue;const name=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE)?.textContent.trim()??"";label.textContent=name;label.htmlFor=input.id;headings.append(label);values.append(input);}
    cueTiming.replaceChildren(headings,values);
  }
  document.querySelector(".timeline").append(timingDetails);
  if (preferences.view==="palette") document.querySelector(".scene-preview").innerHTML=canvasMarkup(scene().canvasObjects ?? [],preferences.objectId,t("designCanvas"))+`<div class="canvas-actions"><label>${t("shapeKind")} <select id="shape-kind"><option value="rect" ${preferences.shapeKind!=="ellipse" ? "selected" : ""}>${t("rectangle")}</option><option value="ellipse" ${preferences.shapeKind==="ellipse" ? "selected" : ""}>${t("ellipse")}</option></select></label><button id="add-canvas-shape">＋ ${t("shapes")}</button></div>`;
  updateDmxFeedback(project.fixtures);
  for (const [index,[key,labelKey,helpKey]] of [["lighting","layersLighting","layerLightingHelp"],["palette","layersPalette","layerPaletteHelp"],["props","layersScene","layerPropsHelp"]].entries()) {
    const item=document.querySelectorAll(".layer-list li")[index],visible=scene().visibility?.[key]!==false;
    const label=t(labelKey),help=esc(t(helpKey));
    item.innerHTML=`<button type="button" class="layer-toggle" data-layer-visibility="${key}" aria-pressed="${visible}" aria-label="${help}" title="${help}"><span class="layer-toggle-label">${label}</span><span class="layer-toggle-state" aria-hidden="true">${visible ? "◉" : "○"}</span></button>`;
  }
  document.querySelector(".palette-panel").hidden=scene().visibility?.palette===false;
  document.querySelector(".scene-preview").classList.toggle("hide-lighting",scene().visibility?.lighting===false);
  document.querySelector(".scene-preview").classList.toggle("hide-props",scene().visibility?.props===false);
  if (activeCue) {
    const channels=activeCue.targets.flatMap((target)=>Object.keys(target.properties).map((property)=>({fixtureId:target.fixtureId,property})));
    timingDetails.insertAdjacentHTML("beforeend", `<fieldset><legend>${t("channelKeyframes")}</legend><label>${t("channel")}<select id="keyframe-channel">${channels.map((channel)=>`<option value="${esc(JSON.stringify(channel))}">${esc(project.fixtures.find((fixture)=>fixture.id===channel.fixtureId)?.name ?? channel.fixtureId)} · ${esc(channel.property)}</option>`).join("")}</select></label><label>${t("startTime")}<input id="keyframe-time" type="number" min="0" max="${activeCue.duration}" step="0.1" value="0" required></label><label>${t("channelValue")}<input id="keyframe-value" type="number" min="0" max="255" step="1" value="127" required></label><button id="save-keyframe" ${channels.length ? "" : "disabled"}>${t("saveKeyframe")}</button>${(activeCue.channelKeyframes ?? []).map((frame,index)=>`<p>${esc(frame.fixtureId)} · ${esc(frame.property)} · ${frame.time}s → ${frame.value} <button data-remove-keyframe="${index}" aria-label="${t("removeKeyframe")}">×</button></p>`).join("")}</fieldset>`);
  }
  const cueEditorIcons=[["#edit-cue","✓","saveCueTiming"],["#schedule-cue","↥","scheduleCue"],["#duplicate-cue","⧉","duplicateCue"],["#delete-cue","×","deleteCue"],["#save-keyframe","＋","saveKeyframe"]];
  for(const [selector,glyph,label] of cueEditorIcons){const button=document.querySelector(selector);if(button){button.textContent=glyph;button.title=t(label);button.setAttribute("aria-label",t(label));}}
  timingDetails.querySelectorAll("[data-move-cue]").forEach((button)=>{const label=button.dataset.moveCue==="-1" ? "earlier" : "later";button.textContent=button.dataset.moveCue==="-1" ? "←" : "→";button.title=t(label);button.setAttribute("aria-label",t(label));});
  const inspector=document.querySelector(".inspector"),fixturePanel=inspector.querySelector(".fixture-inspector");
  if (fixturePanel) fixturePanel.insertAdjacentHTML("beforeend", `<div class="dmx-actions"><button id="duplicate-fixture">${t("duplicateFixture")}</button><button id="delete-fixture">${t("deleteFixture")}</button></div>`);
  const mode=(preferences.inspectorMode ?? (preferences.view==="light" ? "fixture" : "palette"))==="fixture" && fixturePanel ? "fixture" : "palette";
  const palettePanel=document.createElement("div");palettePanel.id="palette-inspector-panel";
  for (const node of [...inspector.children]) if (!node.classList.contains("section-title") && !node.classList.contains("inspector-tabs") && node!==fixturePanel) palettePanel.append(node);
  inspector.append(palettePanel);
  const commandGroup=(name)=>document.querySelector(`.command-group[data-command-group="${name}"]`);
  commandGroup("palette").append(document.querySelector("#palette-versions-menu"),document.querySelector("#palette-compare-menu"));
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
    for(const body of Object.values(bodies)){const heading=body.querySelector("h3"),label=heading.textContent;heading.innerHTML=`<span class="inspector-group-title">${esc(label)}</span>`;}
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
      placement.replaceWith(configuration);configuration.append(placement);
    } else if(nameLabel) {
      nameLabel.replaceWith(configuration);
    }
    const advancedLight=document.createElement("details");advancedLight.className="light-advanced-controls";
    const advancedTitle=document.createElement("summary");advancedTitle.textContent="More light controls";advancedLight.append(advancedTitle);
    for(const id of ["fixture-beam","fixture-white","fixture-pan","fixture-tilt"]){const input=bodies.light.querySelector(`#${id}`);if(input)advancedLight.append(input.closest("label"));}
    bodies.light.append(advancedLight);
    const effectControls=document.querySelector("#effect-type").closest(".dmx-actions"),effectAction=effectControls.querySelector("#play-effect");
    bodies.effects.append(effectControls);bodies.effects.querySelector("h3").append(effectAction);
    const outputNote=document.createElement("small");outputNote.className="fixture-output-note";outputNote.textContent=t("fixtureOutputNote");const applyPatch=document.createElement("button");applyPatch.type="button";applyPatch.id="apply-fixture-patch";applyPatch.className="inspector-icon-action";applyPatch.setAttribute("aria-label",t("applyPatch"));applyPatch.title=t("applyPatch");applyPatch.textContent="▦";bodies.dmx.append(outputNote);bodies.dmx.querySelector("h3").append(applyPatch);bodies.fixture.querySelector("h3").append(apply);
    actions?.remove();
    fixturePanel.append(...Object.values(bodies));
    inspector.querySelector(".section-title h2").textContent=`${t("selectedFixtureTitle")}: ${selectedFixture().name}`;
    inspector.querySelector(".inspector-tabs").hidden=true;
  }
  document.querySelector(".scene-preview").insertAdjacentHTML("beforeend", `<button id="viewport-exit-fullscreen" class="viewport-exit-fullscreen">${t("exitFullscreen")}</button>`);
  bind();
  bindFixtureSliders(document.querySelector(".inspector"),{channelLabel:t("virtualChannelValue")});
  if(preferences.view==="light"){
    const views=document.createElement("div");views.className="viewport-view-controls";views.setAttribute("role","group");views.setAttribute("aria-label",t("cameraAxisViews"));
    const presets=[["front","⊙"],["right","▣"],["top","⬆"],["left","◧"],["back","◨"],["iso","◇"]];
    views.innerHTML=presets.map(([view,glyph])=>`<button type="button" data-camera-view="${view}" title="${t(`cameraView_${view}`)}" aria-label="${t(`cameraView_${view}`)}" disabled>${glyph}</button>`).join("");
    document.querySelector(".workspace-tabs").insertBefore(views,projectionButton);
    const sceneCommandGroup=document.querySelector('.command-group[data-command-group="scene"]');const resetCameraCommand=document.querySelector("#reset-camera");if(resetCameraCommand)sceneCommandGroup.append(resetCameraCommand);
    views.querySelectorAll("[data-camera-view]").forEach(button=>button.onclick=()=>{renderer?.setView?.(button.dataset.cameraView);views.querySelectorAll("[data-camera-view]").forEach(item=>item.setAttribute("aria-pressed",String(item===button)));document.querySelector("#light-canvas")?.focus();});
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
  const guideSearch=document.querySelector("#guide-search");if(guideSearch)guideSearch.addEventListener("input",()=>{const query=guideSearch.value.trim().toLocaleLowerCase();document.querySelectorAll(".guide-section").forEach(section=>{section.hidden=!section.textContent.toLocaleLowerCase().includes(query);if(query&& !section.hidden)section.open=true;});});
  if (preferences.view === "light") {
    const fixtures=currentRendererFixtures(),fixtureSignature=lightLabFixtureState(fixtures),accent=scene().materialColor;
    if(reuseRenderer){if(fixtureSignature!==rendererFixtureSignature)renderer.setFixtures(fixtures);if(accent!==rendererAccent)renderer.setAccent(accent);rendererFixtureSignature=fixtureSignature;rendererAccent=accent;}
    else {renderer=createLightLabRenderer(document.querySelector("#light-canvas"), {camera:viewportCamera,accent,room:scene().room,roomType:scene().roomType,ambience:roomAmbience(scene()),materials:scene().materials,stage:scene().stage,quality:preferences.previewQuality,projection:preferences.projection==="orthographic" ? "orthographic" : "perspective",visibility:scene().visibility,fixtures,onSelect(id){stopPlayback();preferences.fixtureId=id;preferences.inspectorMode="fixture";savePreferences();render();},onTransform(id,transform){commitProjectChange("fixture-move",(draft)=>{draft.fixtures=updateFixture(draft.fixtures,id,{transform});});updateRendererFromFixtures();}});rendererConfigSignature=nextRendererConfig;rendererFixtureSignature=fixtureSignature;rendererAccent=accent;}
    document.querySelectorAll("[data-camera-view]").forEach(button=>button.disabled=!renderer.supported);
    if (!renderer.supported) {
      document.querySelector(".scene-title small").title=phrase("previewFixtureCount",{shown:0,total:sceneFixtures().length}); document.querySelector(".scene-title small").setAttribute("aria-label",document.querySelector(".scene-title small").title);
      const note=document.createElement("p");
      note.className="webgl-unavailable";
      note.setAttribute("role","status");
      note.textContent=t("webglUnavailable");
      document.querySelector("#light-canvas").replaceWith(note);
      document.querySelector("#reset-camera").disabled=true;
      document.querySelector("#export-viewport").disabled=true;
    }
  }
  if (studioScrollTop > 0) document.querySelector(".studio-shell").scrollTop = studioScrollTop;
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
    preferences.fixtureId=sceneFixtures().find((fixture)=>fixture.id!==id)?.id ?? null;savePreferences();render();
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
      const ambienceColor=normalizeHex(document.querySelector("#room-ambience-color").value);
      const ambienceLevel=Number(document.querySelector("#room-ambience-level").value)/100;
      if(!ambienceColor||!Number.isFinite(ambienceLevel)||ambienceLevel<0||ambienceLevel>1)throw new Error(t("invalidAmbientFill"));
      commitProjectChange("scene-room-settings",(draft)=>{editScene(draft,(active)=>{active.room=room;active.ambience={color:ambienceColor,intensity:ambienceLevel};});});status=t("roomSettingsSaved");render();
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
      const channel=JSON.parse(document.querySelector("#keyframe-channel").value),cue=sceneCues().find((item)=>item.id===preferences.cueId) ?? sceneCues().at(-1);
      commitProjectChange("cue-keyframe-save",(draft)=>{draft.cues=draft.cues.map((item)=>item.id===cue.id ? setChannelKeyframe(item,{...channel,time:Number(time.value),value:Number(value.value)}) : item);});render();
    } catch(error) {setStatus(error.message);}
  };
  document.querySelectorAll("[data-remove-keyframe]").forEach((button)=>button.onclick=()=>{
    const cue=sceneCues().find((item)=>item.id===preferences.cueId) ?? sceneCues().at(-1);
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
  const togglePaletteSubpanel=(triggerSelector,panelSelector,otherTriggerSelector,otherPanelSelector)=>{
    const trigger=document.querySelector(triggerSelector),panel=document.querySelector(panelSelector),otherTrigger=document.querySelector(otherTriggerSelector),otherPanel=document.querySelector(otherPanelSelector);
    trigger.onclick=()=>{
      const opening=panel.hidden;
      panel.hidden=!opening;
      trigger.setAttribute("aria-expanded",String(opening));
      otherPanel.hidden=true;
      otherTrigger.setAttribute("aria-expanded","false");
    };
  };
  togglePaletteSubpanel("#open-versions","#palette-versions-menu","#open-compare","#palette-compare-menu");
  togglePaletteSubpanel("#open-compare","#palette-compare-menu","#open-versions","#palette-versions-menu");
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
  document.querySelectorAll("[data-delete-fixture-row]").forEach((button)=>button.onclick=()=>{
    const id=button.dataset.deleteFixtureRow;
    if(!project.fixtures.some((fixture)=>fixture.id===id))return;
    commitProjectChange("fixture-delete",(draft)=>Object.assign(draft,deleteFixture(draft,id)));
    if(preferences.fixtureId===id)preferences.fixtureId=sceneFixtures().find((fixture)=>fixture.id!==id)?.id ?? null;
    savePreferences();render();
  });
  document.querySelectorAll("[data-move-cue]").forEach((button)=>button.onclick=()=>{
    const cueList=sceneCues(),cue=cueList.find((item)=>item.id===preferences.cueId) ?? cueList.at(-1);
    commitProjectChange("cue-reorder",(draft)=>{draft.cues=replaceSceneCues(draft.cues,moveCue(sceneCues(draft.cues,preferences.sceneId,draft.scenes),cue.id,Number(button.dataset.moveCue)),preferences.sceneId,draft.scenes);});
    render();
  });
  document.querySelector("#pause-playback").onclick=togglePlaybackPause;
  const loopControl=document.querySelector("#sequence-loop");if(loopControl)loopControl.onchange=(event)=>{preferences.loopSequence=event.target.checked;savePreferences();};
  document.querySelector("#play-effect").onclick=playEffect;
  document.querySelector("#play-tracks").onclick=playArrangement;
  bindTimelineSeek(document.querySelector(".arrangement-timeline .timeline-ruler"),{
    span:Math.max(30,arrangementDuration(sceneCues())),duration:arrangementDuration(sceneCues()),value:playbackClock && arrangementDuration(sceneCues())>0 ? playbackPosition(playbackClock.elapsed(performance.now()),arrangementDuration(sceneCues()),Boolean(preferences.loopSequence)).time : 0,label:t("seekTracks"),
    onPreview(time){document.querySelector("#arrangement-playhead").style.left=`${time/Math.max(30,arrangementDuration(sceneCues()))*100}%`;},
    onSeek(time,{keyboard}){playArrangement({seek:time,paused:true});if(keyboard)document.querySelector(".arrangement-timeline .timeline-ruler")?.focus();}
  });
  const scheduleButton=document.querySelector("#schedule-cue");
  if (scheduleButton) scheduleButton.onclick=()=>{
    try {
      const input=document.querySelector("#cue-start-time");
      if (!input.value.trim() || !input.checkValidity()) return input.reportValidity();
      const cue=sceneCues().find((item)=>item.id===preferences.cueId) ?? sceneCues().at(-1);
      const track=document.querySelector("#cue-track-name").value;
      commitProjectChange("cue-schedule",(draft)=>{draft.cues=replaceSceneCues(draft.cues,scheduleCue(sceneCues(draft.cues,preferences.sceneId,draft.scenes),cue.id,track,Number(input.value)),preferences.sceneId,draft.scenes);});render();
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
  document.querySelector("#new-group").onclick=clearGroupEditor;
  document.querySelectorAll("[data-edit-group]").forEach((button)=>{
    button.onclick=()=>{
      const group=project.fixtureGroups.find((item)=>item.id===button.dataset.editGroup);
      document.querySelector("#save-group").dataset.groupId=group.id;
      document.querySelector("#group-name").value=group.name;
      document.querySelectorAll("[data-group-member]").forEach((input)=>{input.checked=group.fixtureIds.includes(input.value);});
      document.querySelector("#group-name").focus();
    };
  });
  document.querySelectorAll("[data-delete-group]").forEach((button)=>button.onclick=()=>{
    commitProjectChange("fixture-group-delete",(draft)=>{draft.fixtureGroups=(draft.fixtureGroups ?? []).filter((group)=>group.id!==button.dataset.deleteGroup);});render();
  });
  const duplicateButton=document.querySelector("#duplicate-cue"),deleteButton=document.querySelector("#delete-cue");
  if (duplicateButton) duplicateButton.onclick=()=>{
    const cueList=sceneCues(),cue=cueList.find((item)=>item.id===preferences.cueId) ?? cueList.at(-1);
    const id=crypto.randomUUID();
    commitProjectChange("cue-duplicate",(draft)=>{draft.cues=replaceSceneCues(draft.cues,duplicateCue(sceneCues(draft.cues,preferences.sceneId,draft.scenes),cue.id,{id,name:`${cue.name} · ${t("copyLabel")}`}),preferences.sceneId,draft.scenes);});
    preferences.cueId=id;savePreferences();render();
  };
  if (deleteButton) deleteButton.onclick=()=>{
    const cueList=sceneCues(),cue=cueList.find((item)=>item.id===preferences.cueId) ?? cueList.at(-1),index=cueList.indexOf(cue);
    commitProjectChange("cue-delete",(draft)=>{draft.cues=replaceSceneCues(draft.cues,removeCue(sceneCues(draft.cues,preferences.sceneId,draft.scenes),cue.id),preferences.sceneId,draft.scenes);});
    preferences.cueId=sceneCues()[Math.min(index,sceneCues().length-1)]?.id ?? null;
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
      const cue=sceneCues().find((item)=>item.id===preferences.cueId) ?? sceneCues().at(-1);
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
    if(toolMenu.matches(":popover-open"))toolMenu.hidePopover();
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
  const sceneSelect=document.querySelector("#scene-select");if(sceneSelect)sceneSelect.onchange=(event)=>{if(!project.scenes.some((item)=>item.id===event.target.value))return;stopPlayback();preferences.sceneId=event.target.value;preferences.objectId=null;preferences.fixtureId=sceneFixtures(project.fixtures,preferences.sceneId).at(-1)?.id ?? null;preferences.cueId=sceneCues(project.cues,preferences.sceneId).at(-1)?.id ?? null;savePreferences();render();};
  const addRoomButton=document.querySelector("#add-room-scene");if(addRoomButton)addRoomButton.onclick=showRoomSceneDialog;
  document.querySelector("#seed").onchange = (event) => { const hex = normalizeHex(event.target.value); if (hex) preferences.seed = hex; event.target.value = preferences.seed; savePreferences(); };
  document.querySelector("#harmony").onchange = (event) => { preferences.harmony = event.target.value; savePreferences(); };
  document.querySelector("#reroll").onclick = () => mutateColours((colours) => rerollUnlocked(colours, preferences.seed, preferences.harmony));
  document.querySelector("#add-colour").onclick = () => mutateColours((colours) => { const id = `swatch-${Date.now()}`; preferences.selected = id; return [...colours, { id, name:`Swatch ${colours.length + 1}`, hex:preferences.seed, locked:false }]; });
  document.querySelector("#apply-colour").onclick = () => { const name = document.querySelector("#swatch-name").value.trim(), hex = normalizeHex(document.querySelector("#swatch-hex").value); if (!hex) return setStatus("Enter a valid 3- or 6-digit HEX value."); mutateColours((colours) => updateSwatch(colours, selected().id, { name:name || selected().name, hex })); };
  document.querySelector("#lock-swatch").onclick = () => mutateColours((colours) => updateSwatch(colours, selected().id, { locked:!selected().locked }));
  document.querySelector("#save").onclick = () => saveProject();
  const toolsToggle=document.querySelector("#toggle-tools");
  const toolMenu=document.querySelector("#tool-list");
  const placeToolsMenu=()=>{
    if(!toolMenu.matches(":popover-open"))return;
    const trigger=toolsToggle.getBoundingClientRect(),panel=toolMenu.getBoundingClientRect(),gutter=8;
    toolMenu.style.left=`${Math.max(gutter,Math.min(trigger.left,innerWidth-panel.width-gutter))}px`;
    toolMenu.style.top=`${Math.max(gutter,Math.min(trigger.bottom,innerHeight-panel.height-gutter))}px`;
  };
  let toolsCloseTimer;
  const clearToolsClose=()=>clearTimeout(toolsCloseTimer);
  toolsToggle.onclick=()=>{
    clearToolsClose();
    if(toolMenu.matches(":popover-open")){toolMenu.hidePopover();toolsToggle.setAttribute("aria-expanded","false");}
    else {toolMenu.showPopover();toolsToggle.setAttribute("aria-expanded","true");placeToolsMenu();requestAnimationFrame(placeToolsMenu);}
  };
  toolMenu.addEventListener("toggle",()=>toolsToggle.setAttribute("aria-expanded",String(toolMenu.matches(":popover-open"))));
  const scheduleToolsClose=()=>{
    if(!matchMedia("(hover: hover) and (pointer: fine)").matches)return;
    clearToolsClose();
    toolsCloseTimer=setTimeout(()=>{
      if(!document.querySelector(".tool-section")?.matches(":hover")&&!toolMenu.matches(":hover"))toolMenu.hidePopover();
    },180);
  };
  for(const surface of [document.querySelector(".tool-section"),toolMenu]){
    surface.addEventListener("pointerenter",clearToolsClose);
    surface.addEventListener("pointerleave",scheduleToolsClose);
  }
  const fixturesToggle=document.querySelector("#toggle-fixtures"),fixturesMenu=document.querySelector("#fixture-list"),fixturesSection=document.querySelector(".fixture-list-section");
  if(fixturesToggle&&fixturesMenu){
    const placeFixturesMenu=()=>{if(!fixturesMenu.matches(":popover-open"))return;const trigger=fixturesToggle.getBoundingClientRect(),width=Math.min(Math.max(trigger.width,240),innerWidth-16),height=Math.min(fixturesMenu.scrollHeight,Math.max(120,Math.min(innerHeight*.55,innerHeight-16)));let top=trigger.bottom+4;if(top+height>innerHeight-8)top=Math.max(8,trigger.top-height-4);fixturesMenu.style.left=`${Math.max(8,Math.min(trigger.left,innerWidth-width-8))}px`;fixturesMenu.style.top=`${top}px`;fixturesMenu.style.width=`${width}px`;fixturesMenu.style.maxHeight=`${height}px`;};
    let fixtureLeaveTimer;
    const clearFixtureLeave=()=>clearTimeout(fixtureLeaveTimer);
    const closeFixtureMenu=()=>{clearFixtureLeave();if(fixturesMenu.matches(":popover-open"))fixturesMenu.hidePopover();};
    fixturesToggle.onclick=()=>{clearFixtureLeave();if(fixturesMenu.matches(":popover-open"))closeFixtureMenu();else{fixturesMenu.showPopover();placeFixturesMenu();requestAnimationFrame(placeFixturesMenu);}};
    fixturesMenu.addEventListener("toggle",()=>fixturesToggle.setAttribute("aria-expanded",String(fixturesMenu.matches(":popover-open"))));
    const scheduleFixtureLeave=()=>{if(!matchMedia("(hover: hover) and (pointer: fine)").matches)return;clearFixtureLeave();fixtureLeaveTimer=setTimeout(()=>{if(!fixturesSection.matches(":hover")&&!fixturesMenu.matches(":hover"))closeFixtureMenu();},180);};
    for(const surface of [fixturesSection,fixturesMenu]){surface.addEventListener("pointerenter",clearFixtureLeave);surface.addEventListener("pointerleave",scheduleFixtureLeave);}
    window.addEventListener("resize",placeFixturesMenu,{passive:true});
    document.querySelectorAll("[data-layer-fixture],[data-delete-fixture-row],.fixture-empty-add").forEach(button=>button.addEventListener("click",closeFixtureMenu));
  }
  for(const [key,maxWidth] of [["fixture-groups",430],["virtual-dmx",430]]){
    const trigger=document.querySelector(`#toggle-${key}`),menu=document.querySelector(key==="fixture-groups" ? "#fixture-groups" : "#virtual-dmx-monitor"),section=trigger?.closest("section");
    if(!trigger||!menu||!section)continue;
    const place=()=>{
      if(!menu.matches(":popover-open"))return;
      const box=trigger.getBoundingClientRect(),width=Math.min(maxWidth,innerWidth-16),height=Math.min(menu.scrollHeight,innerHeight-16);
      const left=box.right+8+width<=innerWidth-8 ? box.right+8 : Math.max(8,Math.min(box.left,innerWidth-width-8));
      const top=Math.max(8,Math.min(box.top,innerHeight-height-8));
      Object.assign(menu.style,{left:`${left}px`,top:`${top}px`,width:`${width}px`,maxHeight:`${height}px`});
    };
    let leaveTimer;
    const clear=()=>clearTimeout(leaveTimer);
    trigger.onclick=()=>{clear();if(menu.matches(":popover-open"))menu.hidePopover();else{menu.showPopover();place();requestAnimationFrame(place);}};
    menu.addEventListener("toggle",()=>trigger.setAttribute("aria-expanded",String(menu.matches(":popover-open"))));
    const leave=()=>{if(!matchMedia("(hover: hover) and (pointer: fine)").matches)return;clear();leaveTimer=setTimeout(()=>{if(!section.matches(":hover")&&!menu.matches(":hover"))menu.hidePopover();},180);};
    for(const surface of [section,menu]){surface.addEventListener("pointerenter",clear);surface.addEventListener("pointerleave",leave);}
    window.addEventListener("resize",place,{passive:true});
  }
  document.querySelector("#new-project").onclick=createNewProject;
  document.querySelector("#undo").onclick = undo; document.querySelector("#redo").onclick = redo;
  document.querySelector("#toggle-lux").onclick = () => { preferences.luxOpen = !preferences.luxOpen; savePreferences(); render(); };
  document.querySelector("#cycle-lighting-look")?.addEventListener("click",()=>{
    const current=scene().lightingLookIndex,next=isRoomLightingLookIndex(current)?(current+1)%roomLightingLooks.length:0;
    try{
      commitProjectChange("lighting-look",draft=>{
        const sceneIndex=draft.scenes.findIndex(item=>item.id===preferences.sceneId),active=draft.scenes[sceneIndex];
        if(!active)return;
        const activeFixtures=sceneFixtures(draft.fixtures,active.id,draft.scenes);
        const applied=activeFixtures.length?applyRoomLightingLook(active,draft.fixtures,next,draft.scenes[0]?.id):createRoomStarterLighting(active,draft.fixtures,next);
        draft.scenes[sceneIndex]=applied.scene;draft.fixtures=applied.fixtures;
      });
      status=t("lightingLookApplied");render();
    }catch(error){setStatus(error.message);}
  });
  document.querySelector("#play-room-tour")?.addEventListener("click",(event)=>{
    if(!renderer?.toggleTour){setStatus(t("roomTourUnavailable"));return;}
    const playing=renderer.toggleTour();event.currentTarget.setAttribute("aria-pressed",String(playing));event.currentTarget.setAttribute("aria-label",playing?t("stopRoomTour"):t("playRoomTour"));event.currentTarget.innerHTML=`<span aria-hidden="true">${playing?"■":"▶"}</span> ${playing?t("stopRoomTour"):t("playRoomTour")}`;
    setStatus(playing?t("roomTourStarted"):t("roomTourStopped"));
  });
  const musicButton=document.querySelector("#toggle-room-music");if(musicButton)musicButton.onclick=async()=>{
    try{if(roomMusic.isPlaying())await roomMusic.stop();else await roomMusic.start();musicButton.setAttribute("aria-pressed",String(roomMusic.isPlaying()));musicButton.innerHTML=`<span aria-hidden="true">♫</span> ${roomMusic.isPlaying()?t("pauseMusic"):t("playMusic")}`;setStatus(roomMusic.isPlaying()?t("musicStarted"):t("musicStopped"));}
    catch(error){setStatus(error.message||t("musicUnavailable"));}
  };
  const moodSelect=document.querySelector("#room-music-mood");if(moodSelect)moodSelect.onchange=()=>{preferences.roomMusicMood=roomMusic.setMood(moodSelect.value);savePreferences();};
  const musicVolume=document.querySelector("#room-music-volume");if(musicVolume)musicVolume.oninput=()=>{preferences.roomMusicVolume=roomMusic.setVolume(Number(musicVolume.value)/100);savePreferences();};
  const musicPanel=document.querySelector("#room-music-panel"),musicTrigger=document.querySelector("#open-room-music");if(musicPanel&&musicTrigger){const place=()=>{if(!musicPanel.matches(":popover-open"))return;const rect=musicTrigger.getBoundingClientRect();musicPanel.style.left=`${Math.max(8,Math.min(innerWidth-musicPanel.offsetWidth-8,rect.left))}px`;musicPanel.style.top=`${Math.max(8,Math.min(innerHeight-musicPanel.offsetHeight-8,rect.top-musicPanel.offsetHeight-8))}px`;};let closeTimer=0;const surfaces=[musicTrigger,musicPanel],clearClose=()=>clearTimeout(closeTimer),scheduleClose=()=>{if(!matchMedia("(hover: hover) and (pointer: fine)").matches)return;clearClose();closeTimer=setTimeout(()=>{if(!surfaces.some(surface=>surface.matches(":hover")))musicPanel.hidePopover();},180);};musicPanel.addEventListener("toggle",place);surfaces.forEach(surface=>{surface.addEventListener("pointerenter",clearClose);surface.addEventListener("pointerleave",scheduleClose);});}
  const materialTarget=document.querySelector("#material-target");if(materialTarget) materialTarget.onchange=()=>{preferences.materialTarget=materialTarget.value;savePreferences();};
  const applyScene = document.querySelector("#apply-scene"); if (applyScene) applyScene.onclick = () => { const target=materialTarget.value;commitProjectChange("scene-material",(draft)=>{editScene(draft,(active,index)=>{draft.scenes[index]=applySceneMaterial(active,target,selected().hex);});});status = `${t("apply")} ${selected().hex}`;render(); };
  const resetCamera = () => renderer?.reset();
  document.querySelector("#reset-camera")?.addEventListener("click",resetCamera);
  document.querySelector("#add-fixture").onclick = () => { addVirtualFixture(); render(); };
  document.querySelector(".fixture-empty-add")?.addEventListener("click",()=>{addVirtualFixture();render();});
  const blackoutButton = document.querySelector("#blackout"); if (blackoutButton) blackoutButton.onclick = () => { activateBlackout(); render(); };
  document.querySelector("#apply-fixture-colour").onclick = () => { applyPaletteToVirtualFixtures(); render(); };
  document.querySelector("#create-cue").onclick = createCueSnapshot;
  document.querySelector("#play-cue").onclick = playLatestCue;
  document.querySelector("#stop-cue").onclick = () => { stopPlayback(); render(); };
  document.querySelectorAll("[data-export]").forEach((button) => button.onclick = () => exportFile(button.dataset.export));
  const closeExports = document.querySelector("#close-exports"); if (closeExports) closeExports.onclick = () => { preferences.module="canvas"; render(); };
  const openButton=document.querySelector("#open-project"), projectFile=document.querySelector("#project-file"); if(openButton&&projectFile){openButton.onclick=showSavedProjectsDialog;document.querySelector("#import-project").onclick=()=>projectFile.click();projectFile.onchange=()=>{const [file]=projectFile.files;if(file) importNativeProject(file);projectFile.value="";};}
  const imageImportButton=document.querySelector("#import-image"),paletteImage=document.querySelector("#palette-image");if(imageImportButton&&paletteImage)imageImportButton.onclick=()=>paletteImage.click();
  document.querySelectorAll("[data-profile]").forEach((button)=>button.onclick=()=>{addVirtualFixture(button.dataset.profile);render();});
  const closeLibrary=document.querySelector("#close-library"); if(closeLibrary) closeLibrary.onclick=()=>{preferences.module="canvas";render();};
  const fixtureSelect=document.querySelector("#fixture-select"); if(fixtureSelect) fixtureSelect.onchange=()=>{preferences.fixtureId=fixtureSelect.value;savePreferences();render();};
  const applyFixture=document.querySelector("#apply-fixture"); if(applyFixture) applyFixture.onclick=applyFixtureInspector;
  const applyFixturePatchButton=document.querySelector("#apply-fixture-patch"); if(applyFixturePatchButton) applyFixturePatchButton.onclick=applyFixturePatch;
  const form = document.querySelector("#lux-form"); if (form) {const liveHost=document.createElement("section");liveHost.className="live-copilot-panel";form.before(liveHost);liveCopilotPanel.mount(liveHost);const host=document.createElement("section");host.dataset.luxService="";host.className="lux-service";form.replaceWith(host);luxService.mount(host);}
}
window.addEventListener("keydown", (event) => { if (isEditableTarget(event.target) || event.defaultPrevented || event.isComposing) return; const tool=toolShortcut(event);if(tool){const button=document.querySelector(`[data-tool="${tool}"]`);if(button && !button.disabled){event.preventDefault();button.click();}return;} const shortcut=editorShortcut(event); if (!shortcut) return; event.preventDefault(); if (shortcut === "save") { saveProject(); } else if (shortcut === "undo") undo(); else redo(); });
window.addEventListener("beforeunload",(event)=>{if(!projectDirty)return;event.preventDefault();event.returnValue="";});
account.subscribe(()=>render());
render();


