import {cpSync} from "node:fs";
import {build} from "vite";

const publishableKey=process.env.ALD_SUPABASE_PUBLISHABLE_KEY ?? "";
if(publishableKey && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey))throw new Error("Only a Supabase publishable key may be embedded in the frontend build.");
await build({configFile:false,base:"./",publicDir:false,define:{__ALD_SUPABASE_PUBLISHABLE_KEY__:JSON.stringify(publishableKey)},build:{outDir:"dist",emptyOutDir:true,sourcemap:false}});
cpSync("CNAME","dist/CNAME");
console.log(`Static build completed; Auth ${publishableKey ? "configured" : "unconfigured"}.`);
