import {createHash} from "node:crypto";
import {cpSync, readFileSync, readdirSync, writeFileSync} from "node:fs";
import {join, relative, sep} from "node:path";
import {build} from "vite";

const publishableKey=process.env.ALD_SUPABASE_PUBLISHABLE_KEY ?? "";
if(publishableKey && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey))throw new Error("Only a Supabase publishable key may be embedded in the frontend build.");
const contentSecurityPolicy={
  name:"adigun-production-content-security-policy",
  transformIndexHtml() {
    return [{
      tag:"meta",
      attrs:{
        "http-equiv":"Content-Security-Policy",
        content:"script-src 'self'; object-src 'none'; base-uri 'none'"
      },
      injectTo:"head-prepend"
    }];
  }
};
await build({configFile:false,base:"./",publicDir:false,plugins:[contentSecurityPolicy],define:{__ALD_SUPABASE_PUBLISHABLE_KEY__:JSON.stringify(publishableKey)},build:{outDir:"dist",emptyOutDir:true,sourcemap:false}});
cpSync("public/assets/corporate","dist/assets/corporate",{recursive:true});
cpSync("public/demos","dist/demos",{recursive:true});
cpSync("CNAME","dist/CNAME");
const offlineFiles = ["index.html", ...readdirSync("dist/assets", {recursive:true, withFileTypes:true})
  .filter(entry => entry.isFile())
  .map(entry => relative("dist", join(entry.parentPath, entry.name)).split(sep).join("/"))].sort();
const worker = readFileSync("src/service-worker.js", "utf8");
const releaseHash = createHash("sha256").update(worker);
for (const file of offlineFiles) releaseHash.update(file).update(readFileSync(`dist/${file}`));
const release = {id:releaseHash.digest("hex"), files:offlineFiles};
writeFileSync("dist/service-worker.js", `self.adigunOfflineRelease = ${JSON.stringify(release)};\n${worker}`);
console.log(`Static build completed; Auth ${publishableKey ? "configured" : "unconfigured"}.`);
