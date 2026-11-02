import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureHousing,fixtureSelectionBounds} from '../src/light-lab/renderer.js';
test('generic housing lens follows aim and retains finite closed triangle geometry',()=>{
 const light={x:1,y:3.6,z:.5,targetX:2,targetZ:2,colour:[1,.4,0]},before=structuredClone(light),data=fixtureHousing(light);
 assert.equal(data.length%18,0);assert.ok(data.every(Number.isFinite));assert.deepEqual(light,before);
 const direction=[1,.03-3.6,1.5],length=Math.hypot(...direction),expected=[1,3.49,.5].map((v,i)=>v+direction[i]/length*.3);
 for(let i=0;i<3;i++)assert.ok(Math.abs(data[72+i]-expected[i])<1e-9);
 assert.deepEqual(data.slice(75,78),[1,.4,.025]);
 const aimed=fixtureHousing({...light,targetX:-2});assert.notDeepEqual(aimed.slice(72,75),data.slice(72,75));
 const dark=fixtureHousing({...light,colour:[0,0,0]});assert.deepEqual(dark.slice(75,78),[.025,.025,.025]);
});

test('selection frame encloses every aimed housing vertex with padding',()=>{
 for(const target of [[0,0],[8,-5],[-7,9]]){
  const data=fixtureHousing({x:1,y:3.6,z:.5,targetX:target[0],targetZ:target[1],colour:[1,0,1]}),{min,max}=fixtureSelectionBounds(data);
  assert.ok([...min,...max].every(Number.isFinite));
  for(let offset=0;offset<data.length;offset+=6)for(let axis=0;axis<3;axis++){
   assert.ok(data[offset+axis]>=min[axis]+.039);assert.ok(data[offset+axis]<=max[axis]-.039);
  }
 }
});
