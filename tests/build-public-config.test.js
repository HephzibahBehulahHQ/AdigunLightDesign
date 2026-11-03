import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {existsSync,readFileSync} from "node:fs";
test("production build rejects secret-shaped client configuration before changing output",()=>{
  const before=existsSync("dist/index.html") ? readFileSync("dist/index.html","utf8") : null;
  const invalid="sb_secret_synthetic_test_value";
  const result=spawnSync(process.execPath,["scripts/build.mjs"],{env:{...process.env,ALD_SUPABASE_PUBLISHABLE_KEY:invalid},encoding:"utf8",timeout:30000});
  assert.equal(result.status,1);assert.ok(result.stderr.includes("Only a Supabase publishable key"));assert.ok(!result.stderr.includes(invalid));
  assert.equal(existsSync("dist/index.html") ? readFileSync("dist/index.html","utf8") : null,before);
});
