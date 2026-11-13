export const studioDefaults = Object.freeze({
  locale:"en",
  theme:"dark",
  module:"light",
  view:"light",
  inspectorMode:"fixture",
  tool:"select",
  selected:"deep-blue",
  luxOpen:true,
  harmony:"analogous",
  seed:"#2196F3"
});

export function viewCommandSource({palette,light}) {
  return `<div class="view-command-source" hidden><button class="tab" data-view="palette">2D ${palette}</button><button class="tab" data-view="light">3D ${light}</button></div>`;
}
