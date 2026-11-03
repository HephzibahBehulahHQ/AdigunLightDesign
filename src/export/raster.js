import { paletteSvg } from "./formats.js";

export async function paletteRaster(palette,type="image/png") {
  return svgRaster(paletteSvg(palette),type);
}

export async function svgRaster(svg,type="image/png") {
  if (!["image/png","image/jpeg"].includes(type)) throw new Error("Unsupported image export format.");
  const url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));
  try {
    const image=new Image();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error("Palette image could not be rendered."));image.src=url;});
    const canvas=document.createElement("canvas");
    canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const context=canvas.getContext("2d");
    if (!context) throw new Error("Image export is unavailable in this browser.");
    context.drawImage(image,0,0);
    const blob=await new Promise((resolve)=>canvas.toBlob(resolve,type,.95));
    if (!blob || blob.type!==type) throw new Error("Browser could not encode the requested image format.");
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
