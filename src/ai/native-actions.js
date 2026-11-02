import { validateToolCall } from "./tool-registry.js";
import { validateProject } from "../domain/project.js";
import { commitTransaction } from "../domain/history.js";
import { createFixture,fixtureProfiles,patchFixture,updateFixture } from "../dmx/engine.js";
import { createCue,editCue } from "../timeline/engine.js";
import { addCanvasObject } from "../domain/canvas.js";

const handlers={
  add_fixture(project,payload) {
    if (!fixtureProfiles.some((profile)=>profile.id===payload.profileId)) throw new Error("Unsupported fixture profile.");
    const fixture=createFixture(project.fixtures.length+1,payload.profileId);
    project.fixtures=patchFixture([...project.fixtures,fixture],fixture.id);
  },
  update_fixture(project,payload) {project.fixtures=updateFixture(project.fixtures,payload.fixtureId,payload.changes ?? {});},
  patch_fixture(project,payload) {project.fixtures=patchFixture(project.fixtures,payload.fixtureId,payload.universe,payload.startAddress);},
  create_cue(project,payload) {project.cues.push(createCue(project.fixtures,{name:payload.name,duration:payload.duration ?? 5,fade:payload.fade ?? 1,delay:payload.delay ?? 0,fadeOut:payload.fadeOut ?? 0}));},
  update_cue(project,payload) {
    if (!project.cues.some((cue)=>cue.id===payload.cueId)) throw new Error("Cue was not found.");
    const changes=payload.changes ?? {};
    if (!changes || typeof changes!=="object" || Array.isArray(changes) || !Object.keys(changes).every((key)=>["name","duration","fade","delay","fadeOut"].includes(key))) throw new Error("Unsupported cue changes.");
    project.cues=project.cues.map((cue)=>cue.id===payload.cueId ? editCue(cue,changes) : cue);
  },
  create_scene(project,payload) {project.scenes.push({id:crypto.randomUUID(),name:payload.name,materialColor:"#C21888"});},
  add_object(project,payload) {
    const index=project.scenes.findIndex((scene)=>scene.id===payload.sceneId);
    if (index<0) throw new Error("Scene was not found.");
    project.scenes[index]=addCanvasObject(project.scenes[index],payload.type,payload.fill ?? "#2196F3",{text:payload.text ?? "Text"});
  }
};
export const supportedNativeActions=Object.freeze(Object.keys(handlers));

export function commitNativeToolAction(state,call,{confirmed=false}={}) {
  const validation=validateToolCall(call);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  if (!Object.hasOwn(handlers,call.name)) throw new Error("This registered tool has no native executor yet.");
  if (confirmed!==true) throw new Error("Project action requires explicit confirmation.");
  const before=validateProject(state.project);if(!before.valid)throw new Error("Source project is invalid.");
  const result=commitTransaction(state,`lux:${call.name}`,(draft)=>{
    handlers[call.name](draft,structuredClone(call.payload));
    const after=validateProject(draft);if(!after.valid)throw new Error(after.errors.join(" "));
  });
  return {...result,receipt:{tool:call.name,mode:"local-native-action",physicalOutput:false,historyId:result.project.history.at(-1).id}};
}
