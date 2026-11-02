import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
for (const path of ["src", "index.html", "CNAME"]) {
  cpSync(path, `dist/${path}`, { recursive: true });
}
console.log("Static build completed.");
