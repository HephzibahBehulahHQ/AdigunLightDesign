import test from "node:test";
import assert from "node:assert/strict";
import { createImageAssetStore } from "../src/domain/image-assets.ts";
import { previewNativeToolAction,confirmNativeToolAction } from "../src/ai/action-preview.js";
import { createStudioMoodProject } from "../src/domain/studio-mood.js";
const asset=()=>({pixels:new Uint8ClampedArray([255,0,0,255,0,0,255,255]),width:2,height:1,name:"Local test"});
test("approved image cache bounds memory and does not expose mutable source pixels",()=>{
  const store=createImageAssetStore(2),source=asset(),first=store.add(source);
  source.pixels[0]=0;assert.equal(store.get(first).pixels[0],255);
  const copy=store.get(first);copy.pixels[0]=0;assert.equal(store.get(first).pixels[0],255);
  store.add(asset());store.add(asset());assert.equal(store.get(first),null);assert.equal(store.size,2);
  assert.ok(!Object.hasOwn(store.list()[0],"pixels"));
  store.clear();assert.equal(store.size,0);
  assert.throws(()=>store.add({...asset(),width:257}));
});
test("image action uses approved pixels and confirms the exact extracted palette",()=>{
  const store=createImageAssetStore(),id=store.add(asset()),project=createStudioMoodProject();
  const call={type:"adigunlightdesign.tool-call",version:1,name:"extract_image_palette",payload:{assetId:id,count:2}};
  assert.throws(()=>previewNativeToolAction(project,call),/unavailable/);
  const proposal=previewNativeToolAction(project,call,{imageAssets:store});
  assert.equal(project.palettes.length,1);
  const result=confirmNativeToolAction({project,undoStack:[],redoStack:[]},proposal,{confirmed:true});
  assert.deepEqual(new Set(result.project.palettes.at(-1).colors.map((color)=>color.hex)),new Set(["#FF0000","#0000FF"]));
  assert.equal(result.project.palettes.at(-1).sourceAssetId,id);
});
