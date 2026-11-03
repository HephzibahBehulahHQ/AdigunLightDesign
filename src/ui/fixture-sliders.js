export function bindFixtureSliders(root,{channelLabel}) {
  for(const id of ["fixture-dimmer","fixture-beam"]){
    const input=root.querySelector(`#${id}`);if(!input)continue;
    input.type="range";input.min="0";input.max="255";input.step="1";
    const output=root.ownerDocument.createElement("output");output.htmlFor=input.id;output.className="fixture-slider-value";
    input.after(output);
    const update=()=>{
      const value=Number(input.value),percent=Math.round(value/255*100);
      output.textContent=id==="fixture-dimmer" ? `${percent} % · ${value}/255` : `${value}/255`;
      input.setAttribute("aria-valuetext",`${output.textContent} · ${channelLabel}`);
    };
    input.addEventListener("input",update);update();
  }
}
