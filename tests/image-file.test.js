import test from "node:test";
import assert from "node:assert/strict";
import { readImagePalette } from "../src/domain/image-file.js";
test("rejects unsupported or oversized uploads before decoding",async()=>{
  for (const file of [null,{type:"image/svg+xml",size:100},{type:"image/png",size:10_000_001},{type:"image/jpeg",size:0}]) await assert.rejects(readImagePalette(file));
});
