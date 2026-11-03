import { createLuxBrowserClient } from "./browser-client.js";
import { buildLuxProjectContext } from "./project-context.js";
import { previewNativeToolAction } from "./action-preview.js";
import { runNativeReadOnlyTool } from "./read-only-actions.js";

// Credentials and pending requests live only in this closure, never project data.
export function createLuxChatSession({fetchImpl=globalThis.fetch}={}) {
  let client=null,generation=0,pending=false;
  return {
    configure(configuration) {
      const next=createLuxBrowserClient({...configuration,fetchImpl});
      generation++;client=next;pending=false;
    },
    disconnect() {generation++;client=null;pending=false;},
    get status() {return {configured:client!==null,pending,endpoint:client?.endpoint ?? null};},
    async request({project,question,locale,consent=false}) {
      if(!client)throw new Error("Configure a Adigun AI service before sending a request.");
      if(pending)throw new Error("A Adigun AI request is already pending.");
      const requestGeneration=generation,baseline=JSON.stringify(project);
      const snapshot=structuredClone(project),context=buildLuxProjectContext(snapshot);
      pending=true;
      try {
        const result=await client.suggest({question,locale,context,consent});
        if(requestGeneration!==generation)throw new Error("Adigun AI connection changed. Response discarded.");
        if(JSON.stringify(project)!==baseline)throw new Error("Project changed while Adigun AI was responding. Request fresh suggestions.");
        // No native action is executed here. Each proposed call needs its own review.
        return {...result,calls:structuredClone(result.calls),baseline};
      } finally {if(requestGeneration===generation)pending=false;}
    },
    review(project,response,index,options={}) {
      if(!response || response.baseline!==JSON.stringify(project))throw new Error("Project changed. Request fresh suggestions.");
      if(!Number.isInteger(index) || index<0 || index>=response.calls.length)throw new Error("Suggestion is missing.");
      const call=response.calls[index];
      if(["check_contrast","export_project"].includes(call.name))return {kind:"read-only",result:runNativeReadOnlyTool(project,call)};
      return {kind:"mutation",proposal:previewNativeToolAction(project,call,options)};
    }
  };
}
