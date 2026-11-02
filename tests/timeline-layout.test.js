import test from "node:test";
import assert from "node:assert/strict";
import { timelineLayout } from "../src/timeline/layout.js";
test("timeline bars preserve duration ratios and consecutive boundaries",()=>{
  const layout=timelineLayout([{id:"a",duration:10},{id:"b",duration:30}]);
  assert.equal(layout.total,40);assert.equal(layout.span,40);
  assert.equal(layout.segments[0].width,25);
  assert.equal(layout.segments[1].left,25);
  assert.equal(layout.segments[1].width,75);
  assert.equal(layout.ticks.at(-1).time,40);
  assert.equal(timelineLayout([]).span,30);
  assert.throws(()=>timelineLayout([{duration:NaN}]));
});
