import { validateProject } from "../domain/project.js";
export function buildLuxProjectContext(project) {
  if(!validateProject(project).valid)throw new Error("Project context requires a valid project.");
  const short=(value)=>String(value).slice(0,200);
  const context={
    project:{id:project.id,name:short(project.name),schemaVersion:project.schemaVersion},
    totals:{palettes:project.palettes.length,scenes:project.scenes.length,fixtures:project.fixtures.length,cues:project.cues.length},
    includedLimits:{palettes:8,colorsPerPalette:32,scenes:8,fixtures:32,cues:32},
    palettes:project.palettes.slice(0,8).map((palette)=>({id:palette.id,name:short(palette.name),totalColors:palette.colors.length,colors:palette.colors.slice(0,32).map((color)=>({id:color.id,name:short(color.name),hex:color.hex,locked:color.locked,opacity:color.opacity ?? 1}))})),
    scenes:project.scenes.slice(0,8).map((scene)=>({id:scene.id,name:short(scene.name),materialColor:scene.materialColor,room:structuredClone(scene.room),materials:structuredClone(scene.materials)})),
    fixtures:project.fixtures.slice(0,32).map((fixture)=>({id:fixture.id,name:short(fixture.name),profileId:fixture.profileId,modeId:fixture.modeId,properties:structuredClone(fixture.properties),transform:structuredClone(fixture.transform),patchAssignment:structuredClone(fixture.patchAssignment)})),
    cues:project.cues.slice(0,32).map((cue)=>({id:cue.id,name:short(cue.name),duration:cue.duration,fade:cue.fade,delay:cue.delay ?? 0,fadeOut:cue.fadeOut ?? 0,capturedFixtureCount:cue.targets.length})),
    exclusions:["raw images","asset files","history","credentials","project description","canvas artwork"]
  };
  if(JSON.stringify(context).length>40000)throw new Error("Project summary exceeds the Adigun AI context budget.");
  return context;
}
