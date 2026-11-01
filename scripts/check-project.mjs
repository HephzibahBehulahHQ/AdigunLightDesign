import { existsSync, readFileSync } from "node:fs";

const required = ["README.md", "AGENTS.md", "docs/M0_AUDIT.md", "docs/ARCHITECTURE.md", "docs/SECURITY.md", "docs/I18N.md", "src/domain/project.js"];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) throw new Error(`Missing required files: ${missing.join(", ")}`);
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
if (!manifest.scripts?.test || !manifest.scripts?.build) throw new Error("Missing required validation scripts.");
console.log("Project contract check passed.");
