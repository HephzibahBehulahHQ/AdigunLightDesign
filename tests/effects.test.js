import test from "node:test";
import assert from "node:assert/strict";
import { evaluateEffect } from "../src/timeline/effects.js";
const fixtures=[{id:"a",properties:{dimmer:72,red:200}},{id:"b",properties:{dimmer:90,red:100}}];
test("pulse is deterministic, periodic and bounded without changing source fixtures",()=>{
  const sample=(time)=>evaluateEffect(fixtures,{type:"pulse",period:2,minimum:20,maximum:200},time)[0].properties.dimmer;
  assert.equal(sample(0),20);assert.equal(sample(1),200);assert.equal(sample(2),20);
  assert.equal(fixtures[0].properties.dimmer,72);
  assert.equal(evaluateEffect(fixtures,{},1)[0].properties.red,200);
});
test("chase advances through fixture order and wraps",()=>{
  const sample=(time)=>evaluateEffect(fixtures,{type:"chase",period:2},time).map((fixture)=>fixture.properties.dimmer);
  assert.deepEqual(sample(0),[255,0]);assert.deepEqual(sample(1),[0,255]);assert.deepEqual(sample(2),[255,0]);
  assert.deepEqual(evaluateEffect([],{type:"chase"},0),[]);
});
test("effects reject invalid timing and channel limits",()=>{
  for (const options of [{type:"unknown"},{period:0},{minimum:-1},{maximum:256},{minimum:200,maximum:100}]) assert.throws(()=>evaluateEffect(fixtures,options,0));
  assert.throws(()=>evaluateEffect(fixtures,{},NaN));
});
