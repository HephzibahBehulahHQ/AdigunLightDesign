import { existsSync, readFileSync } from "node:fs";

const required = ["README.md", "AGENTS.md", "CHANGELOG.md", "index.html", "docs/M0_AUDIT.md", "docs/ARCHITECTURE.md", "docs/DEVELOPMENT.md", "docs/TESTING.md", "docs/DEPLOYMENT.md", "docs/SECURITY.md", "docs/I18N.md", "docs/COLOR_ENGINE.md", "docs/LIGHTING_ENGINE.md", "docs/DMX.md", "docs/TIMELINE.md", "docs/EXPORT_FORMATS.md", "docs/AI_TOOLS.md", "docs/COMPATIBILITY.md", "src/app.js", "src/domain/project.js", "src/domain/import-project.js", "src/domain/color-engine.js", "src/light-lab/renderer.js", "src/dmx/engine.js", "src/timeline/engine.js", "src/export/formats.js", "src/ai/tool-registry.js"];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) throw new Error(`Missing required files: ${missing.join(", ")}`);
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
if (!manifest.scripts?.test || !manifest.scripts?.build) throw new Error("Missing required validation scripts.");
console.log("Project contract check passed.");
