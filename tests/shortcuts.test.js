import test from "node:test";
import assert from "node:assert/strict";
import { editorShortcut, isEditableTarget,toolShortcut,toolKeys } from "../src/accessibility/shortcuts.js";

test("maps editor-safe command shortcuts", () => { assert.equal(editorShortcut({ctrlKey:true,key:"s"}),"save"); assert.equal(editorShortcut({metaKey:true,key:"z",shiftKey:true}),"redo"); assert.equal(editorShortcut({ctrlKey:true,key:"x"}),null); });
test("leaves native editing controls alone", () => { assert.equal(isEditableTarget({tagName:"INPUT"}),true); assert.equal(isEditableTarget({tagName:"DIV",isContentEditable:false}),false); });
test("tool shortcuts reuse tool identities and preserve text entry modifier commands composition and repeats",()=>{
  for(const [key,tool] of Object.entries(toolKeys))assert.equal(toolShortcut({key:key.toUpperCase()}),tool);
  for(const event of [{key:"s",ctrlKey:true},{key:"s",metaKey:true},{key:"r",altKey:true},{key:"t",repeat:true},{key:"t",isComposing:true},{key:"b",defaultPrevented:true},{key:"v",target:{tagName:"INPUT"}},{key:"v",target:{tagName:"TEXTAREA"}},{key:"v",target:{isContentEditable:true}},{key:"constructor"}])assert.equal(toolShortcut(event),null);
  assert.equal(editorShortcut({key:"s",ctrlKey:true}),"save");
});
