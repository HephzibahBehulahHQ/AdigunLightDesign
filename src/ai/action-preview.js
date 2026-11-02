import { commitNativeToolAction } from "./native-actions.js";
import { commitTransaction } from "../domain/history.js";
import { validateProject } from "../domain/project.js";
const proposals=new WeakMap();

export function previewNativeToolAction(project,call) {
  const planned=commitNativeToolAction({project,undoStack:[],redoStack:[]},call,{confirmed:true}).project;
  planned.history=structuredClone(project.history);
  const changes=[];
  for (const collection of ["palettes","scenes","fixtures","cues"]) {
    const before=new Map(project[collection].map((item)=>[item.id,item])),after=new Map(planned[collection].map((item)=>[item.id,item]));
    for(const id of new Set([...before.keys(),...after.keys()])) if(JSON.stringify(before.get(id))!==JSON.stringify(after.get(id))) changes.push({collection,id,before:structuredClone(before.get(id) ?? null),after:structuredClone(after.get(id) ?? null)});
  }
  const proposal=Object.freeze({tool:call.name,requiresConfirmation:true,changes:structuredClone(changes)});
  proposals.set(proposal,{baseline:JSON.stringify(project),candidate:structuredClone(planned),tool:call.name});
  return proposal;
}

export function confirmNativeToolAction(state,proposal,{confirmed=false}={}) {
  const plan=proposals.get(proposal);
  if(!plan)throw new Error("Action preview is missing, expired or already applied.");
  if(confirmed!==true)throw new Error("Action requires explicit confirmation.");
  if(JSON.stringify(state.project)!==plan.baseline)throw new Error("Project changed. Generate a new action preview.");
  if(!validateProject(plan.candidate).valid)throw new Error("Action candidate is invalid.");
  const result=commitTransaction(state,`lux:${plan.tool}`,(draft)=>Object.assign(draft,structuredClone(plan.candidate)));
  proposals.delete(proposal);
  return {...result,receipt:{tool:plan.tool,mode:"confirmed-local-preview",physicalOutput:false,historyId:result.project.history.at(-1).id}};
}
