export const studioDefaults = Object.freeze({
  locale:"en",
  theme:"dark",
  module:"light",
  view:"light",
  inspectorMode:"fixture",
  tool:"select",
  selected:"deep-blue",
  luxOpen:true,
  seed:"#2196F3"
});

export function studioActiveModule({module,view}) {
  if (module === "library" || module === "copilot") return module;
  return view === "light" ? "light" : "palette";
}
