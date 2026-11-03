import {createCloudProjectStore} from "./projects.js";
import {createClient} from "@supabase/supabase-js";
export const sharedSupabaseUrl="https://fqcbfnktdvqojyezxeis.supabase.co";

export function createAccount({publishableKey="",clientFactory=createClient}={}){
  if(publishableKey && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey))throw new Error("A frontend publishable key is required.");
  const listeners=new Set();let user=null,generation=0,disposed=false,pending=null;
  const client=publishableKey ? clientFactory(sharedSupabaseUrl,publishableKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}}) : null;
  const emit=()=>{for(const listener of listeners)listener(user ? {...user} : null);};
  function verify(){
    if(!client || disposed)return Promise.resolve(null);
    if(pending)return pending;
    const version=generation;
    const operation=(async()=>{
    let data,error;try{({data,error}=await client.auth.getUser());}catch{error=true;}
    if(version!==generation || disposed)return null;
    const verified=!error && data?.user?.id && data.user.is_anonymous===false ? {id:data.user.id,is_anonymous:false,email:data.user.email ?? ""} : null;
    if(JSON.stringify(verified)!==JSON.stringify(user)){user=verified;emit();}
    return user ? {...user} : null;
    })();pending=operation;
    void operation.finally(()=>{if(pending===operation)pending=null;});return operation;
  }
  const subscription=client?.auth.onAuthStateChange((event,session)=>{
    if(disposed)return;
    generation++;pending=null;
    if(event==="SIGNED_OUT" || !session){if(user){user=null;emit();}}
    else queueMicrotask(()=>{void verify();});
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
    async signIn(email,password){
      if(!client || disposed)throw new Error("authUnavailable");
      if(typeof email!=="string" || !email.trim() || email.length>320 || typeof password!=="string" || !password || password.length>1024)throw new Error("authSignInFailed");
      let result;try{result=await client.auth.signInWithPassword({email:email.trim(),password});}catch{throw new Error("authSignInFailed");}
      if(result.error || !await verify())throw new Error("authSignInFailed");return {...user};
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
