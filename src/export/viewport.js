export function viewportPng(canvas,redraw) {
  return new Promise((resolve,reject)=>{
    if (!canvas || typeof canvas.toBlob!=="function" || typeof redraw!=="function") return reject(new Error("Viewport image export is unavailable."));
    // Encode in the same task as drawing, before WebGL discards its buffer.
    redraw();
    canvas.toBlob((blob)=>{
      if (!blob || blob.type!=="image/png" || !blob.size) return reject(new Error("Browser could not encode the viewport as PNG."));
      resolve(blob);
    },"image/png");
  });
}
