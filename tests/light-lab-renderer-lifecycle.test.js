import test from "node:test";
import assert from "node:assert/strict";
import { lightLabFixtureState,lightLabRendererConfig,shouldReuseLightLabRenderer } from "../src/light-lab/renderer-lifecycle.js";

const scene={room:{width:5,height:3,depth:4},materials:{walls:"#222222"},stage:{enabled:false},visibility:{lighting:true,props:true,palette:true}};

test("ordinary selection and fixture updates keep the scene renderer reusable",()=>{
  const config=lightLabRendererConfig(scene,"balanced","perspective");
  const fixtures=[{id:"head-1",selected:true,properties:{dimmer:255}}];
  const updatedFixtures=[{id:"head-1",selected:false,properties:{dimmer:127}},{id:"head-2",selected:true,properties:{dimmer:255}}];

  assert.notEqual(lightLabFixtureState(fixtures),lightLabFixtureState(updatedFixtures));
  assert.equal(lightLabRendererConfig(scene,"balanced","perspective"),config);
  assert.equal(shouldReuseLightLabRenderer({renderer:{},canvas:{},view:"light",previousConfig:config,nextConfig:config}),true);
});

test("scene and renderer configuration changes require a fresh WebGL renderer",()=>{
  const config=lightLabRendererConfig(scene,"balanced","perspective");
  assert.equal(shouldReuseLightLabRenderer({renderer:{},canvas:{},view:"palette",previousConfig:config,nextConfig:config}),false);
  assert.equal(shouldReuseLightLabRenderer({renderer:{},canvas:null,view:"light",previousConfig:config,nextConfig:config}),false);
  assert.notEqual(lightLabRendererConfig(scene,"quality","perspective"),config);
  assert.notEqual(lightLabRendererConfig({...scene,room:{...scene.room,width:6}},"balanced","perspective"),config);
});
