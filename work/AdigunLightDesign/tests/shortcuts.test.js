import test from "node:test";
import assert from "node:assert/strict";
import { editorShortcut, isEditableTarget } from "../src/accessibility/shortcuts.js";

test("maps editor-safe command shortcuts", () => { assert.equal(editorShortcut({ctrlKey:true,key:"s"}),"save"); assert.equal(editorShortcut({metaKey:true,key:"z",shiftKey:true}),"redo"); assert.equal(editorShortcut({ctrlKey:true,key:"x"}),null); });
test("leaves native editing controls alone", () => { assert.equal(isEditableTarget({tagName:"INPUT"}),true); assert.equal(isEditableTarget({tagName:"DIV",isContentEditable:false}),false); });
