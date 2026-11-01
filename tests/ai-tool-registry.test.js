import test from "node:test";
import assert from "node:assert/strict";
import { previewToolCall, toolRegistry, validateToolCall } from "../src/ai/tool-registry.js";

test("contains every specified Lux tool and rejects arbitrary names", () => { assert.equal(Object.keys(toolRegistry).length,16); assert.equal(validateToolCall({type:"adigunlightdesign.tool-call",version:1,name:"eval",payload:{code:"alert(1)"}}).valid,false); });
test("validates structured tool arguments before any action preview", () => { const call={type:"adigunlightdesign.tool-call",version:1,name:"check_contrast",payload:{foreground:"#000000",background:"#ffffff"}}; assert.equal(validateToolCall(call).valid,true); assert.equal(previewToolCall(call).requiresConfirmation,false); });
test("marks project mutation proposals for explicit confirmation", () => { const preview=previewToolCall({type:"adigunlightdesign.tool-call",version:1,name:"patch_fixture",payload:{fixtureId:"wash",universe:1,startAddress:1}}); assert.equal(preview.valid,true); assert.equal(preview.requiresConfirmation,true); });
