import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {palettePdf} from '../src/export/pdf.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const palette={name:'Àwọ̀ - Farben',colors:Array.from({length:21},(_,i)=>({id:String(i),name:'Swatch '+i,hex:'#2196F3'}))};
test('PDF exporter paginates complete palette and embeds raster artwork on A4 pages',async()=>{
 const calls=[],before=structuredClone(palette);
 const blob=await palettePdf(palette,{raster:async(p,type)=>{calls.push({p,type});return new Blob([png],{type});}});
 assert.equal(blob.type,'application/pdf');const doc=await PDFDocument.load(await blob.arrayBuffer());assert.equal(doc.getPageCount(),3);
 assert.deepEqual(calls.map(x=>x.p.colors.length),[10,10,1]);assert.ok(calls.every(x=>x.type==='image/png'));assert.deepEqual(palette,before);
 assert.equal(doc.getTitle(),palette.name);for(const page of doc.getPages())assert.ok(Math.abs(page.getWidth()-595.28)<.01);
});
test('PDF validates the complete palette and rejects failed or incorrect raster encoding',async()=>{
 let called=false;await assert.rejects(()=>palettePdf({...palette,colors:[{hex:'invalid'}]},{raster:()=>{called=true;}}));assert.equal(called,false);
 await assert.rejects(()=>palettePdf(palette,{raster:async()=>new Blob([png],{type:'image/jpeg'})}),/PNG/);
 await assert.rejects(()=>palettePdf(palette,{raster:async()=>{throw Error('encoding unavailable');}}),/encoding unavailable/);
});

