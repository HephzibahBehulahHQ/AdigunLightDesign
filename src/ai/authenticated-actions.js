import {previewNativeToolAction,confirmNativeToolAction} from "./action-preview.js";
import {fixtureProfiles,fixtureFootprint,firstAvailableAddress} from "../dmx/engine.js";
const owners=new WeakMap();
async function registeredUser(account){
  const user=await account.requireUser();
  if(typeof user?.id!=="string" || !user.id || user.is_anonymous!==false || account.user?.id!==user.id)throw new Error("authRequired");
  return user;
}
export async function previewUnpatchedFixture({getProject,suggestion,account,isCurrent=()=>true}){
  const baseline=JSON.stringify(getProject()),user=await registeredUser(account);
  if(!isCurrent() || JSON.stringify(getProject())!==baseline)throw new Error("liveProposalExpired");
  if(suggestion?.action!=="review-patch")throw new Error("liveUnsupportedSuggestion");
  const project=getProject(),fixture=project.fixtures.find(item=>item.id===suggestion.fixtureId);
  if(!fixture || fixture.patchAssignment)throw new Error("liveProposalExpired");
  const profile=fixtureProfiles.find(item=>item.id===fixture.profileId);
  if(!profile)throw new Error("livePatchUnavailable");
  const startAddress=firstAvailableAddress(project.fixtures,1,fixtureFootprint(profile,fixture.modeId));
  if(startAddress===null)throw new Error("livePatchUnavailable");
  const proposal=previewNativeToolAction(project,{type:"adigunlightdesign.tool-call",version:1,name:"patch_fixture",payload:{fixtureId:fixture.id,universe:1,startAddress}});
  owners.set(proposal,user.id);return proposal;
}
export async function confirmAuthenticatedAction({getState,proposal,account,confirmed=false,isCurrent=()=>true}){
  if(confirmed!==true)throw new Error("liveConfirmationRequired");
  const user=await registeredUser(account);
  if(!isCurrent())throw new Error("liveProposalExpired");
  if(owners.has(proposal) && owners.get(proposal)!==user.id)throw new Error("liveProposalOwnerChanged");
  const result=confirmNativeToolAction(getState(),proposal,{confirmed:true});
  return {...result,receipt:{...result.receipt,mode:"verified-memory-only",persisted:false}};
}
