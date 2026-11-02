import test from "node:test";
import assert from "node:assert/strict";
import { createProject, validateProject, CURRENT_SCHEMA_VERSION } from "../src/domain/project.js";

test("creates a versioned project document", () => {
  const project = createProject({ id: "project-1", name: "Studio Mood" });
  assert.equal(project.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(project.name, "Studio Mood");
  assert.deepEqual(validateProject(project), { valid: true, errors: [] });
});

test("rejects an incomplete imported project", () => {
  const result = validateProject({ schemaVersion: CURRENT_SCHEMA_VERSION, id: "x", name: "" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 1);
});
