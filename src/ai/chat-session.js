import { createLuxBrowserClient } from "./browser-client.js";
import { buildLuxProjectContext } from "./project-context.js";
import { previewNativeToolAction } from "./action-preview.js";
import { runNativeReadOnlyTool } from "./read-only-actions.js";

// Credentials and pending requests live only in this closure, never project data.
export function createLuxChatSession({fetchImpl=globalThis.fetch}={}) {
  let client=null,generation=0,pendingController=null;
  function invalidateRequest() {
    generation++;
    pendingController?.abort();
    pendingController=null;
  }
  return {
    configure(configuration) {
      const next=createLuxBrowserClient({...configuration,fetchImpl});
      invalidateRequest();
      client=next;
    },
    disconnect() {invalidateRequest();client=null;},
    clearProject:invalidateRequest,
    get status() {return {configured:client!==null,pending:pendingController!==null,endpoint:client?.endpoint ?? null};},
    async request({project,question,locale,consent=false}) {
      if(!client)throw new Error("Configure a Adigun AI service before sending a request.");
      if(pendingController)throw new Error("A Adigun AI request is already pending.");
      const requestGeneration=generation,baseline=JSON.stringify(project);
      const snapshot=structuredClone(project),context=buildLuxProjectContext(snapshot);
      pendingController=new AbortController();
      let result;
      try {
        result=await client.suggest({question,locale,context,consent,signal:pendingController.signal});
      } catch(error) {
        if(requestGeneration!==generation)throw new Error("Adigun AI connection or workspace changed. Response discarded.");
        throw error;
      } finally {if(requestGeneration===generation)pendingController=null;}
      if(requestGeneration!==generation)throw new Error("Adigun AI connection or workspace changed. Response discarded.");
      if(JSON.stringify(project)!==baseline)throw new Error("Project changed while Adigun AI was responding. Request fresh suggestions.");
      // Each proposed call needs its own review.
      return {...result,calls:structuredClone(result.calls),baseline};
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
