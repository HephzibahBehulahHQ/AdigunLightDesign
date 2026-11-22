import {createCloudProjectStore} from "./projects.js";
export const sharedSupabaseUrl="https://fqcbfnktdvqojyezxeis.supabase.co";

export function createAccount({publishableKey="",clientFactory,fetchImpl=globalThis.fetch}={}){
  if(publishableKey && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey))throw new Error("A frontend publishable key is required.");
  if(publishableKey && typeof clientFactory!=="function")throw new Error("An Auth client factory is required.");
  const listeners=new Set();let user=null,generation=0,disposed=false,pending=null;
  const client=publishableKey ? clientFactory(sharedSupabaseUrl,publishableKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}}) : null;
  async function request(payload){
    const response=await fetchImpl("/api/account",{
      method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok || !result)throw new Error({
      "invalid-product-credentials":"authSignInFailed",
      "invalid-or-expired-email-code":"authInvalidCode",
      "email-code-request-required":"authCodeRestart",
      "wait-and-retry":"authCodeWait",
      "product-account-not-authorized":"authProductNotAuthorized"
    }[result?.error] || "authUnavailable");
    return result;
  }
  const emit=()=>{for(const listener of listeners)listener(user ? {...user} : null);};
  function verify(){
    if(!client || disposed)return Promise.resolve(null);
    if(pending)return pending;
    const version=generation;
    const operation=(async()=>{
    let identity=null;
    try{
      const {data,error}=await client.auth.getUser();
      if(!error && data?.user?.id && data.user.is_anonymous===false && version===generation){
        const result=await client.rpc("adigunlightdesign_has_verified_product_session");
        if(!result.error && result.data===true)identity=data.user;
      }
    }catch{ /* An unverifiable identity cannot unlock product data. */ }
    if(version!==generation || disposed)return null;
    const verified=identity ? {id:identity.id,is_anonymous:false,email:identity.email ?? ""} : null;
    if(JSON.stringify(verified)!==JSON.stringify(user)){user=verified;emit();}
    return user ? {...user} : null;
    })();pending=operation;
    void operation.finally(()=>{if(pending===operation)pending=null;});return operation;
  }
  const subscription=client?.auth.onAuthStateChange((event,session)=>{
    if(disposed)return;
    generation++;pending=null;
    if(event==="SIGNED_OUT" || !session){if(user){user=null;emit();}}
    else setTimeout(()=>{void verify();},0);
  }).data.subscription;
  const projects=typeof client?.schema==="function" ? createCloudProjectStore({
    client,
    async withUser(operation){
      const identity=await verify();
      if(!identity) throw new Error("authRequired");
      const version=generation;
      const result=await operation(identity.id);
      if(disposed || generation!==version || user?.id!==identity.id) throw new Error("cloudSessionChanged");
      return result;
    }
  }) : null;
  return {
    projects,
    get configured(){return client!==null;},
    get user(){return user ? {...user} : null;},
    subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
    async begin(mode,email,password){
      if(!client || disposed)throw new Error("authUnavailable");
      const result=await request({step:"begin",mode,email:email.trim(),password});
      if(result.step!=="verify")throw new Error("authUnavailable");
    },
    async verifyCode(code){
      if(!client || disposed)throw new Error("authUnavailable");
      const result=await request({step:"verify",code:code.trim()});
      if(result.step==="signed-in"){
        if(typeof result.session?.access_token!=="string" || typeof result.session?.refresh_token!=="string")throw new Error("authUnavailable");
        const session=await client.auth.setSession(result.session);
        if(session.error || !await verify())throw new Error("authSignInFailed");
      }else if(result.step==="password-reset" && user){
        await this.signOut();
      }else if(result.step!=="registered" && result.step!=="password-reset")throw new Error("authUnavailable");
      return result.step;
    },
    async guestTrial(allowStart){
      const result=await request({step:"guest",allowStart});
      if(result.step!=="guest" || !Number.isInteger(result.remainingMs) || result.remainingMs<0 || result.remainingMs>240000)throw new Error("authUnavailable");
      return result.remainingMs;
    },
    async signOut(){
      if(!client || disposed)return;
      let result;try{result=await client.auth.signOut({scope:"local"});}catch{throw new Error("authSignOutFailed");}
      if(result.error)throw new Error("authSignOutFailed");generation++;user=null;emit();
    },
    async requireUser(){const verified=await verify();if(!verified)throw new Error("authRequired");return verified;},
    dispose(){disposed=true;generation++;subscription?.unsubscribe();client?.auth.stopAutoRefresh();listeners.clear();user=null;}
  };
}
