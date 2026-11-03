import {fixtureProfiles} from "../dmx/engine.js";

export function explainSelection({project,selection}) {
  if(!selection || typeof selection!=="object")return null;
  const {kind,id}=selection;
  if(kind==="fixture"){
    const fixture=project.fixtures.find(item=>item.id===id);if(!fixture)return null;
    const profile=fixtureProfiles.find(item=>item.id===fixture.profileId),patch=fixture.patchAssignment;
    return {name:fixture.name,descriptionKey:"explainFixture",facts:[
      {key:"explainProfile",value:profile?.model ?? fixture.profileId},
      {key:"explainVirtualDimmer",value:String(fixture.properties.dimmer ?? 0)},
      {key:"explainPatch",value:patch ? `${patch.universe} / ${patch.startAddress}–${patch.startAddress+patch.channelFootprint-1}` : null},
      {key:"explainCueCount",value:String(project.cues.filter(cue=>cue.targets.some(target=>target.fixtureId===id)).length)}
    ]};
  }
  if(kind==="swatch"){
    const palette=project.palettes.find(item=>item.id===selection.paletteId),swatch=palette?.colors.find(item=>item.id===id);if(!swatch)return null;
    return {name:swatch.name,descriptionKey:"explainSwatch",facts:[{key:"explainPalette",value:palette.name},{key:"hex",value:swatch.hex},{key:"explainOpacity",value:`${Math.round((swatch.opacity ?? 1)*100)} %`},{key:"explainLocked",valueKey:swatch.locked ? "explainYes" : "explainNo"}]};
  }
  if(kind==="object"){
    const scene=project.scenes.find(item=>item.id===selection.sceneId),object=scene?.canvasObjects?.find(item=>item.id===id);if(!object)return null;
    return {name:object.type==="text" ? object.text : id,descriptionKey:"explainObject",facts:[{key:"explainObjectType",valueKey:object.type==="rect" ? "rectangle" : object.type==="ellipse" ? "ellipse" : "text"},{key:"explainPosition",value:`${object.x}, ${object.y}`},{key:"explainFill",value:object.fill},...(object.type==="text" ? [] : [{key:"explainSize",value:`${object.width} × ${object.height}`}])]};
  }
  return null;
}
