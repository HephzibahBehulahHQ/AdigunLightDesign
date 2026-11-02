import { validateProject } from "../domain/project.js";

export function createCanvasStateFeed() {
  const listeners=new Set();let current=null,serialized="",revision=0;
  return {
    publish(project,{selection=null,playing=false}={}) {
      if(!validateProject(project).valid)throw new Error("Live observation requires valid project state.");
      const value={project,selection,playing},next=JSON.stringify(value);
      if(next===serialized)return false;
      serialized=next;current={...structuredClone(value),revision:++revision};
      for(const listener of listeners)listener(structuredClone(current));
      return true;
    },
    subscribe(listener) {
      if(typeof listener!=="function")throw new Error("Observer must be a function.");
      listeners.add(listener);if(current)listener(structuredClone(current));
      return ()=>listeners.delete(listener);
    }
  };
}

export function analyzeLightingState(state,{goal=""}={}) {
  const project=state.project,findings=[];
  // Missing patches are a real state fact, not evidence of failed hardware.
  for(const fixture of project.fixtures)if(!fixture.patchAssignment)findings.push({
    id:`unpatched:${fixture.id}`,kind:"offer",messageKey:"liveUnpatched",subject:fixture.name,
    explanationKey:"liveUnpatchedExplanation",fixtureId:fixture.id,action:"review-patch"
  });
  if(!goal.trim())findings.push({id:`goal:${project.id}`,kind:"question",messageKey:"liveGoalQuestion",explanationKey:"liveGoalExplanation",action:"set-goal"});
  return findings;
}

export function createLiveCopilot({feed,now=Date.now,onSuggestion,debounceMs=600,intervalMs=25000,dismissMs=120000}={}) {
  if(!feed || typeof onSuggestion!=="function" || typeof now!=="function" || !Number.isFinite(debounceMs) || debounceMs<0 || !Number.isFinite(intervalMs) || intervalMs<20000 || !Number.isFinite(dismissMs) || dismissMs<intervalMs)throw new Error("Invalid live co-pilot configuration.");
  let state=null,changedAt=0,lastShown=-Infinity,typingUntil=0,dragging=false,enabled=false,goal="",disposed=false;
  const suppressed=new Map();
  const unsubscribe=feed.subscribe(value=>{
    if(state && state.project.id!==value.project.id){goal="";suppressed.clear();}
    state=value;changedAt=now();
  });
  return {
    setEnabled(value){enabled=value===true;},
    setGoal(value){if(typeof value!=="string" || value.length>1000)throw new Error("Invalid project goal.");goal=value.trim();},
    activity({typing=false,dragging:drag}={}){if(typing)typingUntil=now()+1500;if(typeof drag==="boolean")dragging=drag;},
    dismiss(id){suppressed.set(id,now()+dismissMs);},
    tick(){
      const time=now();
      if(disposed || !enabled || !state || dragging || time<typingUntil || time-changedAt<debounceMs || time-lastShown<intervalMs)return null;
      const finding=analyzeLightingState(state,{goal}).find(item=>(suppressed.get(item.id) ?? -Infinity)<=time);
      if(!finding)return null;
      lastShown=time;suppressed.set(finding.id,time+dismissMs);
      const suggestion={...finding,revision:state.revision};onSuggestion(structuredClone(suggestion));return suggestion;
    },
    dispose(){disposed=true;unsubscribe();state=null;suppressed.clear();}
  };
}
