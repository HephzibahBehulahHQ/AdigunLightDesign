import {arrangeTracks} from "../timeline/tracks.js";
import {PDFDocument,PageSizes,StandardFonts,rgb} from "pdf-lib";
import {paletteRaster,svgRaster} from "./raster.js";
import {paletteSvg} from "./formats.js";

// Raster artwork preserves browser-rendered Unicode and opacity. It is not
// searchable text, an editable vector palette or a color-managed print proof.
export async function palettePdf(palette,{raster=paletteRaster}={}){
  paletteSvg(palette); // Validate the entire palette before doing any encoding.
  const snapshot=structuredClone(palette),doc=await PDFDocument.create();
  doc.setCreator("AdigunLightDesign");doc.setTitle(String(snapshot.name ?? "Palette"));
  const font=await doc.embedFont(StandardFonts.Helvetica),count=Math.ceil(snapshot.colors.length/10);
  const segmenter=new Intl.Segmenter("und",{granularity:"grapheme"});
  const shorten=(value,max)=>{const text=Array.from(segmenter.segment(String(value ?? "")),item=>item.segment);return text.length>max?text.slice(0,max-1).join("")+"…":text.join("");};
  for(let index=0;index<count;index++){
    const colors=snapshot.colors.slice(index*10,index*10+10).map(color=>({...color,name:shorten(color.name,12)}));
    const imageBlob=await raster({...snapshot,name:shorten(snapshot.name,28),colors},"image/png");
    if(!imageBlob || imageBlob.type!=="image/png")throw new Error("PDF palette rendering requires PNG artwork.");
    const image=await doc.embedPng(await imageBlob.arrayBuffer()),page=doc.addPage(PageSizes.A4);
    const [width,height]=PageSizes.A4,scale=Math.min((width-48)/image.width,(height-110)/image.height);
    page.drawRectangle({x:0,y:0,width,height,color:rgb(.043,.071,.125)});
    page.drawText("AdigunLightDesign",{x:24,y:height-34,size:18,font,color:rgb(.75,.45,1)});
    page.drawImage(image,{x:24,y:height-62-image.height*scale,width:image.width*scale,height:image.height*scale});
    page.drawText(`${index+1} / ${count}    |    ${index*10+1}-${index*10+colors.length} / ${snapshot.colors.length}`,{x:24,y:24,size:10,font,color:rgb(.97,.98,.99)});
  }
  return new Blob([await doc.save()],{type:"application/pdf"});
}

export async function cuePdf(cues,{raster=svgRaster}={}) {
  const doc=await PDFDocument.create();
  doc.setTitle("AdigunLightDesign cue sheet");
  const font=await doc.embedFont(StandardFonts.Helvetica);
  const schedule=arrangeTracks(cues).flatMap(track=>track.entries.map(entry=>({...entry,track:track.id})));
  const escape=value=>String(value).replace(/[&<>]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;"})[char]);
  const rows=schedule.map(({cue,start,track},index)=>{
    const delay=cue.delay ?? 0, fadeOut=cue.fadeOut ?? 0;
    const timing=[start,start+cue.duration,delay,cue.fade,fadeOut].map(value=>Number(value.toFixed(6))).join(" / ");
    return [index+1,track,cue.name,timing,cue.targets.length].map(escape);
  });
  const pageCount=Math.max(1,Math.ceil(rows.length/18));
  for(let pageIndex=0;pageIndex<pageCount;pageIndex++){
    const contents=rows.slice(pageIndex*18,pageIndex*18+18);
    const columns=[24,76,302,634,1080], widths=[48,216,322,436,86];
    const cells=(values,y)=>values.map((value,i)=>`<svg x="${columns[i]}" y="${y}" width="${widths[i]}" height="30" overflow="hidden"><text x="0" y="21">${value}</text></svg>`).join("");
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${60+Math.max(1,contents.length)*34}"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" font-size="20" fill="#0b1220">${cells(["#","Track","Cue","Start / End / Delay / Fade / Out (s)","Targets"],12)}${contents.map((row,i)=>cells(row,48+i*34)).join("")}</g></svg>`;
    const image=await doc.embedPng(await (await raster(svg)).arrayBuffer());
    const [height,width]=PageSizes.A4;
    const page=doc.addPage([width,height]);
    page.drawText("AdigunLightDesign | Cue sheet",{x:24,y:height-34,size:18,font});
    const scale=(width-48)/image.width;
    page.drawImage(image,{x:24,y:height-50-image.height*scale,width:image.width*scale,height:image.height*scale});
    page.drawText(`${pageIndex+1} / ${pageCount}`,{x:24,y:24,size:10,font});
  }
  return new Blob([await doc.save()],{type:"application/pdf"});
}

