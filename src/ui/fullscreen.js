export function canFullscreen(element,document) {
  return document.fullscreenEnabled!==false && typeof element?.requestFullscreen==="function" && typeof document.exitFullscreen==="function";
}
export async function toggleViewportFullscreen(element,document) {
  if(!canFullscreen(element,document))throw new Error("Fullscreen is unavailable in this browser.");
  if(document.fullscreenElement===element)await document.exitFullscreen();
  else await element.requestFullscreen();
}
