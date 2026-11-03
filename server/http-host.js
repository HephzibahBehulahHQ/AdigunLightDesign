import { createServer } from "node:http";
import { Readable } from "node:stream";

export function createLuxHttpServer({handle,baseUrl="http://127.0.0.1"}) {
  const base=new URL(baseUrl);
  if(typeof handle!=="function" || !["http:","https:"].includes(base.protocol) || base.username || base.password)throw new Error("Invalid Lux HTTP host configuration.");
  const server=createServer({maxHeaderSize:8192},async(incoming,outgoing)=>{
    const abort=new AbortController();incoming.on("aborted",()=>abort.abort());
    outgoing.on("close",()=>{if(!outgoing.writableEnded)abort.abort();});
    try {
      if(!incoming.url?.startsWith("/") || incoming.url.startsWith("//"))throw new Error("Invalid request path.");
      const method=incoming.method ?? "GET",headers=new Headers();
      for(const [name,value] of Object.entries(incoming.headers))if(value!==undefined)headers.set(name,Array.isArray(value) ? value.join(", ") : value);
      const request=new Request(new URL(incoming.url,base),{method,headers,signal:abort.signal,...(["GET","HEAD"].includes(method) ? {} : {body:Readable.toWeb(incoming),duplex:"half"})});
      const response=await handle(request);
      if(!(response instanceof Response))throw new Error("Invalid endpoint response.");
      const body=Buffer.from(await response.arrayBuffer());
      if(outgoing.destroyed)return;
      outgoing.writeHead(response.status,Object.fromEntries(response.headers));
      outgoing.end(method==="HEAD" ? undefined : body);
    } catch {
      if(outgoing.destroyed)return;
      if(outgoing.headersSent){outgoing.destroy();return;}
      outgoing.writeHead(500,{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
      outgoing.end(JSON.stringify({error:{code:"host_failed",message:"Service request could not be completed."}}));
    }
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxRequestsPerSocket=100;
  return server;
}
