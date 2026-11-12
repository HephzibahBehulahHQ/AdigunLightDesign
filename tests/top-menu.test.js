import test from "node:test";
import assert from "node:assert/strict";
import {topMenuMarkup,searchProject,bindTopMenu} from "../src/ui/top-menu.js";
import {translate} from "../src/i18n.js";
import {createStudioMoodProject} from "../src/domain/studio-mood.js";
test("top menu preserves requested order and treats anonymous or absent sessions as guest",()=>{
  const t=key=>translate("en",key),options={t,locale:"en",saved:true};
  const html=topMenuMarkup(options),ids=['header-save-status','account-menu','id="locale"','settings-menu','search-menu','help-menu'];
  const positions=ids.map(id=>html.indexOf(id));assert.ok(positions.every((position,index)=>position>=0 && (!index || position>positions[index-1])));
  assert.ok(html.includes("Saved locally"));assert.ok(html.includes('is-guest'));assert.ok(!html.includes('is-signed-in'));
  assert.ok(topMenuMarkup({...options,user:{id:"test",is_anonymous:true}}).includes('is-guest'));
  assert.ok(topMenuMarkup({...options,user:{id:"test",is_anonymous:false}}).includes('is-signed-in'));
  assert.ok(!topMenuMarkup({...options,saved:false}).includes("Saved locally"));
  for(const code of ["en","de","yo","pcm"])assert.ok(html.includes(`value="${code}"`));
});
test("Help opens the current project guide from main",()=>{
  const controls=new Map(["account-menu","settings-menu","search-menu","help-menu"].map(id=>[`#${id}`,{}]));let dialog;
  const documentRef={body:{append(node){dialog=node;}},createElement:()=>({setAttribute(){},showModal(){},querySelector(){return null;},remove(){}}),querySelector:selector=>controls.get(selector)};
  bindTopMenu({documentRef,project:createStudioMoodProject(),t:key=>translate("en",key),onSelect:()=>{}});
  controls.get("#help-menu").onclick();
  assert.ok(dialog.innerHTML.includes('href="https://github.com/HephzibahBehulahHQ/AdigunLightDesign/blob/main/docs/HELP.md"'));
});
test("local search is bounded and reads project names without modifying or executing them",()=>{
  const project=createStudioMoodProject();project.fixtures[0].name="<script>studio</script>";const before=JSON.stringify(project);
  const results=searchProject(project,"STUDIO");assert.ok(results.some(result=>result.id===project.fixtures[0].id));assert.equal(JSON.stringify(project),before);
  assert.deepEqual(searchProject(project," "),[]);assert.deepEqual(searchProject(project,null),[]);
  project.fixtures=Array.from({length:50},(_,i)=>({...project.fixtures[0],id:`fixture-${i}`}));assert.equal(searchProject(project,"studio").length,30);
});
