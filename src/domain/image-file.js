import { extractImagePalette } from "./image-palette.js";

export async function readImagePalette(file) {
  if (!file || !["image/png","image/jpeg","image/webp"].includes(file.type)) throw new Error("Choose a PNG, JPEG or WebP image.");
  if (!file.size || file.size>10_000_000) throw new Error("Image must be smaller than 10 MB.");
  const bitmap=await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width*bitmap.height>20_000_000) throw new Error("Image dimensions exceed the 20-megapixel limit.");
    const scale=Math.min(1,256/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext("2d",{willReadFrequently:true});
    if (!context) throw new Error("Image processing is unavailable in this browser.");
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const colors=extractImagePalette(context.getImageData(0,0,canvas.width,canvas.height).data);
    if (!colors.length) throw new Error("Image has no visible colors.");
    return colors;
  } finally { bitmap.close(); }
}
