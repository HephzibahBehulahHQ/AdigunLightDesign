import { createOpenAiLuxAdapter } from "./openai-lux.js";
import { createLuxEndpoint,bearerAuthenticator } from "./lux-endpoint.js";
import { createLuxHttpServer } from "./http-host.js";

try {
  const port=Number(process.env.LUX_PORT ?? 8787),host=process.env.LUX_BIND_HOST ?? "127.0.0.1";
  if(!Number.isInteger(port) || port<1 || port>65535 || !["127.0.0.1","::1","0.0.0.0"].includes(host))throw new Error("Invalid service bind address or port.");
  const allowedOrigins=(process.env.LUX_ALLOWED_ORIGINS ?? "").split(",").map((value)=>value.trim()).filter(Boolean);
  if(!allowedOrigins.length)throw new Error("Configure exact LUX_ALLOWED_ORIGINS before starting the service.");
  const suggest=createOpenAiLuxAdapter(),authenticate=bearerAuthenticator(process.env.LUX_SERVICE_TOKEN);
  const handle=createLuxEndpoint({suggest,authenticate,allowedOrigins,audit:async(event)=>console.info(JSON.stringify({event:"lux-suggestion",...event}))});
  const server=createLuxHttpServer({handle});
  server.on("error",()=>{console.error("Lux service could not bind its configured address.");process.exitCode=1;});
  server.listen(port,host,()=>console.info(`Lux API service listening on ${host}:${port}.`));
  for(const signal of ["SIGINT","SIGTERM"])process.once(signal,()=>{server.close();server.closeIdleConnections();});
} catch(error) {console.error(error.message);process.exitCode=1;}
