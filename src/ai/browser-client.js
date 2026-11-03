import { validateToolCall } from "./tool-registry.js";

export function luxEndpointUrl(value) {
  if(typeof value!=="string" || value.length>2000)throw new Error("Invalid Lux service URL.");
  const url=new URL(value),loopback=["localhost","127.0.0.1","[::1]","::1"].includes(url.hostname);
  if((url.protocol!=="https:" && !(url.protocol==="http:" && loopback)) || url.username || url.password || url.search || url.hash || url.pathname!=="/api/lux")throw new Error("Lux requires an HTTPS service URL or loopback HTTP URL ending in /api/lux.");
  return url.href;
}

export function createLuxBrowserClient({endpoint,accessToken,fetchImpl=globalThis.fetch,timeoutMs=30000}) {
  const url=luxEndpointUrl(endpoint);
  if(typeof accessToken!=="string" || !/^[\x21-\x7e]{32,512}$/.test(accessToken) || typeof fetchImpl!=="function" || !Number.isInteger(timeoutMs) || timeoutMs<1 || timeoutMs>60000)throw new Error("Invalid Lux service access configuration.");
  return {
    endpoint:url,
    async suggest({question,locale,context,consent=false}) {
      if(consent!==true)throw new Error("Explicit consent is required before sending project context.");
      if(typeof question!=="string" || !question.trim() || question.length>4000 || !["en","de","yo","pcm"].includes(locale) || !context || typeof context!=="object" || Array.isArray(context) || JSON.stringify(context).length>50000)throw new Error("Invalid Lux browser request.");
      let response;
      try {response=await fetchImpl(url,{method:"POST",credentials:"omit",redirect:"error",signal:AbortSignal.timeout(timeoutMs),headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},body:JSON.stringify({question,locale,context,consent:true})});}
      catch {throw new Error("Lux service could not be reached.");}
      if(!response.ok)throw new Error(`Lux service rejected the request (${response.status}).`);
      let result;
      try {const text=await response.text();if(text.length>256000)throw new Error();result=JSON.parse(text);}
      catch {throw new Error("Lux service returned an invalid response.");}
      if(!result || typeof result.requestId!=="string" || !result.requestId || typeof result.answer!=="string" || result.answer.length>8000 || !Array.isArray(result.calls) || result.calls.length>8 || !result.calls.every((call)=>validateToolCall(call).valid))throw new Error("Lux service returned unsupported suggestions.");
      return {requestId:result.requestId,answer:result.answer,calls:structuredClone(result.calls)};
    }
  };
}
