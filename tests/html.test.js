import test from "node:test";
import assert from "node:assert/strict";
import { fixtureOptions,swatchButton } from "../src/ui/html.js";
test("imported fixture identifiers and names stay inside escaped option values/text",()=>{
  const id='a"><img src=x onerror="alert(1)">',name='<script>alert("x")</script>';
  const html=fixtureOptions([{id,name}],id);
  assert.ok(!html.includes("<img"));assert.ok(!html.includes("<script>"));
  assert.ok(html.includes('value="a&quot;&gt;&lt;img'));
  assert.ok(html.includes("selected"));
});
test("imported swatch identifiers cannot inject attributes and colors are normalized",()=>{
  const html=swatchButton({id:'x" autofocus onfocus="alert(1)',name:"<b>'&",hex:"#f00",locked:true},"other");
  assert.ok(html.includes('data-swatch="x&quot; autofocus onfocus=&quot;alert(1)"'));
  assert.ok(!html.includes('data-swatch="x"'));
  assert.ok(html.includes("&lt;b&gt;&#39;&amp;"));
  assert.ok(html.includes("background:#FF0000"));
  assert.throws(()=>swatchButton({id:"a",name:"A",hex:'url("unsafe")'},"a"));
});
