import { timingSafeEqual } from "node:crypto";
import { validateToolCall } from "../src/ai/tool-registry.js";

export function bearerAuthenticator(token) {
  if(typeof token!=="string" || token.length<32)throw new Error("Service access token must contain at least 32 characters.");
  const expected=Buffer.from(`Bearer ${token}`);
  return async(request)=>{
    const supplied=Buffer.from(request.headers.get("authorization") ?? "");
    return supplied.length===expected.length && timingSafeEqual(supplied,expected) ? "configured-service-user" : null;
  };
}

async function boundedJson(request,maximum) {
  if(!request.body)throw new Error("invalid");
  const reader=request.body.getReader(),chunks=[];let size=0;
  try {
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximum){await reader.cancel();throw new Error("large");}chunks.push(value);}
  } finally {reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}catch{throw new Error("invalid");}
}

export function createLuxEndpoint({suggest,authenticate=async()=>null,allowedOrigins=[],audit=async()=>{},now=Date.now,requestsPerMinute=10,maxUsers=1000}={}) {
  if(typeof authenticate!=="function" || typeof audit!=="function" || typeof now!=="function" || !Array.isArray(allowedOrigins) || !Number.isInteger(requestsPerMinute) || requestsPerMinute<1 || requestsPerMinute>1000 || !Number.isInteger(maxUsers) || maxUsers<1 || maxUsers>10000)throw new Error("Invalid Lux endpoint configuration.");
  const origins=new Set(allowedOrigins.map((origin)=>{const url=new URL(origin);if(!["http:","https:"].includes(url.protocol) || url.origin!==origin)throw new Error("Allowed origins must be exact HTTP(S) origins.");return origin;})),limits=new Map();
  return async function handle(request) {
    const origin=request.headers.get("origin"),headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Content-Type":"application/json; charset=utf-8",Vary:"Origin"};
    if(origin && origins.has(origin))headers["Access-Control-Allow-Origin"]=origin;
    const reply=(status,code,message)=>new Response(JSON.stringify({error:{code,message}}),{status,headers});
    if(new URL(request.url).pathname!=="/api/lux")return reply(404,"not_found","Endpoint was not found.");
    if(origin && !origins.has(origin))return reply(403,"origin_denied","Origin is not allowed.");
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{...headers,"Access-Control-Allow-Methods":"POST","Access-Control-Allow-Headers":"Authorization, Content-Type"}});
    if(request.method!=="POST")return reply(405,"method_not_allowed","Use POST.");
    let userId;
    try{userId=await authenticate(request);}catch{return reply(401,"unauthorized","Authentication is required.");}
    if(typeof userId!=="string" || !userId || userId.length>200)return reply(401,"unauthorized","Authentication is required.");
    const time=now();for(const [id,entry] of limits)if(time-entry.started>=60000)limits.delete(id);
    let entry=limits.get(userId);
    if(!entry){if(limits.size>=maxUsers)return reply(503,"capacity","Service is temporarily at capacity.");entry={started:time,count:0};limits.set(userId,entry);}
    if(entry.count>=requestsPerMinute)return reply(429,"rate_limited","Request limit reached. Try again later.");
    entry.count++;
    if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")return reply(415,"content_type","JSON content is required.");
    let payload;
    try{payload=await boundedJson(request,65536);}catch(error){return error.message==="large" ? reply(413,"body_limit","Request body is too large.") : reply(400,"invalid_json","Request JSON is invalid.");}
    if(!payload || payload.consent!==true)return reply(400,"consent_required","Explicit consent to send this request to the AI provider is required.");
    if(typeof payload.question!=="string" || !payload.question.trim() || payload.question.length>4000 || !["en","de","yo","pcm"].includes(payload.locale) || !payload.context || typeof payload.context!=="object" || Array.isArray(payload.context) || JSON.stringify(payload.context).length>50000)return reply(400,"invalid_request","Question, locale or context is invalid.");
    if(typeof suggest!=="function")return reply(503,"unconfigured","AI provider is not configured.");
    const requestId=crypto.randomUUID();
    try {
      const result=await suggest({question:payload.question,locale:payload.locale,context:payload.context});
      if(!result || typeof result.answer!=="string" || result.answer.length>8000 || !Array.isArray(result.calls) || result.calls.length>8 || !result.calls.every((call)=>validateToolCall(call).valid))throw new Error("invalid provider result");
      await audit({requestId,userId,status:"suggested",tools:result.calls.map((call)=>call.name),timestamp:new Date(time).toISOString()});
      return new Response(JSON.stringify({requestId,answer:result.answer,calls:result.calls}),{status:200,headers});
    }catch{return reply(502,"provider_failed","AI suggestion could not be completed.");}
  };
}
