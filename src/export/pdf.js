import {PDFDocument,PageSizes,StandardFonts,rgb} from "pdf-lib";
import {paletteRaster} from "./raster.js";
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
