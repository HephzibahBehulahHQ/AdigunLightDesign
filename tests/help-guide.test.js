import test from "node:test";
import assert from "node:assert/strict";
import {helpGuideMarkup} from "../src/ui/help-guide.js";

test("beginner guide covers project setup, studio modes, lighting, timeline and exports in every locale",()=>{
  for(const [locale,concepts] of Object.entries({en:["Project","Fixtures","Timeline","Export"],de:["Projekt","Leuchten","Timeline","Export"],yo:["Project","Fìtílà","timeline","Export"],pcm:["Project","Fixtures","timeline","Export"]})){
    const markup=helpGuideMarkup(locale);
    assert.equal((markup.match(/class="guide-section"/g)||[]).length,10,`${locale} has all ten guide sections`);
    for(const concept of concepts){assert.match(markup,new RegExp(concept,"i"),`${locale} guide explains ${concept}`);}
  }
});

test("guide content escapes markup and remains searchable as ordinary text",()=>{
  const markup=helpGuideMarkup("en");
  assert.match(markup,/100 room paint and lighting looks/);
  assert.doesNotMatch(markup,/<script/i);
});

