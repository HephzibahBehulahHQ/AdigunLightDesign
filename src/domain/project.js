export const CURRENT_SCHEMA_VERSION = 1;

export function createProject({ id = crypto.randomUUID(), name = "Untitled lighting project" } = {}) {
  const now = new Date().toISOString();
  return {
    id,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name,
    description: "",
    createdAt: now,
    updatedAt: now,
    preferences: { locale: "en", theme: "dark", renderingQuality: "high" },
    palettes: [], scenes: [], fixtures: [], patches: [], cues: [], assets: [], history: []
  };
}

export function validateProject(project) {
  const errors = [];
  if (!project || typeof project !== "object") errors.push("Project must be an object.");
  if (project?.schemaVersion !== CURRENT_SCHEMA_VERSION) errors.push("Unsupported project schema version.");
  if (typeof project?.id !== "string" || !project.id.trim() || typeof project?.name !== "string" || !project.name.trim()) errors.push("Project needs a string id and a nonempty name.");
  for (const key of ["palettes", "scenes", "fixtures", "patches", "cues", "assets", "history"]) {
    if (!Array.isArray(project?.[key])) errors.push(`Project.${key} must be an array.`);
  }
  return { valid: errors.length === 0, errors };
}
