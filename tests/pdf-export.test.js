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

test('PDF shortening preserves Yoruba combining accents and emoji grapheme clusters',async()=>{
 const cluster='o\u0323\u0300',emoji='👩🏾‍💻',calls=[];
 const source={name:cluster.repeat(30),colors:[{hex:'#2196F3',name:cluster.repeat(14)},{hex:'#FFB347',name:emoji.repeat(14)}]};
 await palettePdf(source,{raster:async p=>{calls.push(p);return new Blob([png],{type:'image/png'});}});
 assert.equal(calls[0].name,cluster.repeat(27)+'…');assert.equal(calls[0].colors[0].name,cluster.repeat(11)+'…');
 assert.equal(calls[0].colors[1].name,emoji.repeat(11)+'…');assert.equal(source.colors[0].name,cluster.repeat(14));
});
test("cue PDF paginates scheduled rows and escapes cue labels",async()=>{
 const {cuePdf}=await import("../src/export/pdf.js"),pages=[];
 const cues=Array.from({length:19},(_,i)=>({id:String(i),name:i===18?"o\u0323\u0300".repeat(20):"Àwọ̀ <cue>",trackId:"Main",startTime:i*5,duration:5,fade:1,targets:[]}));
 const blob=await cuePdf(cues,{raster:async svg=>{pages.push(svg);return new Blob([png],{type:"image/png"});}});
 assert.equal((await PDFDocument.load(await blob.arrayBuffer())).getPageCount(),2);
 assert.match(pages[0],/Àwọ̀ &lt;cue&gt;/);
 assert.ok(pages[1].includes("o\u0323\u0300".repeat(14)+"…"));
 assert.match(pages[1],/>90<.*>95<.*>0<.*>1<.*>0</);
 assert.match(pages[0],/>Start \(s\)</);
});
