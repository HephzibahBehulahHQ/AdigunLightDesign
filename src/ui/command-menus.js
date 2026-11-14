export function bindCommandMenus({documentRef=document,leaveDelay=220}={}) {
  const system=documentRef.querySelector(".command-menu-system");
  if(!system)return ()=>{};
  const view=documentRef.defaultView;
  const abort=new view.AbortController();
  const signal=abort.signal;
  let active=null,timer=0;

  const getParts=(wrapper)=>({
    trigger:wrapper.querySelector("[data-command-menu-trigger]"),
    panel:wrapper.querySelector("[data-command-group]")
  });
  const openPanel=(wrapper)=>{
    const {trigger,panel}=getParts(wrapper);
    if(!trigger||!panel)return;
    if(active===wrapper){closePanel(true);return;}
    closePanel(false);
    documentRef.querySelectorAll("dialog[open]").forEach(dialog=>dialog.close());
    active=wrapper;
    panel.showPopover();
    trigger.setAttribute("aria-expanded","true");
    position(wrapper);
  };
  const position=(wrapper)=>{
    if(!wrapper)return;
    const {trigger,panel}=getParts(wrapper);
    if(!trigger||!panel||!panel.matches(":popover-open"))return;
    const anchor=trigger.getBoundingClientRect();
    const bounds=panel.getBoundingClientRect();
    const width=bounds.width||Math.min(340,view.innerWidth-16);
    const height=Math.min(panel.scrollHeight,view.innerHeight-16);
    const left=Math.max(8,Math.min(anchor.left,view.innerWidth-width-8));
    let top=anchor.bottom+5;
    if(top+height>view.innerHeight-8)top=Math.max(8,anchor.top-height-5);
    panel.style.left=`${left}px`;
    panel.style.top=`${top}px`;
    panel.style.maxHeight=`${Math.max(120,Math.min(height,view.innerHeight-16))}px`;
  };
  function closePanel(restoreFocus=false){
    clearTimeout(timer);
    const wrapper=active;
    if(!wrapper)return;
    active=null;
    const {trigger,panel}=getParts(wrapper);
    if(panel?.matches(":popover-open"))panel.hidePopover();
    trigger?.setAttribute("aria-expanded","false");
    if(restoreFocus)trigger?.focus({preventScroll:true});
  }
  const clearLeave=()=>{clearTimeout(timer);timer=0;};
  const scheduleLeave=(wrapper,event)=>{
    if(event.pointerType!=="mouse")return;
    clearLeave();
    timer=view.setTimeout(()=>{
      const {trigger,panel}=getParts(wrapper);
      if(active===wrapper&&!trigger?.matches(":hover")&&!panel?.matches(":hover"))closePanel(false);
    },leaveDelay);
  };

  system.querySelectorAll("[data-command-menu]").forEach(wrapper=>{
    const {trigger,panel}=getParts(wrapper);
    trigger.addEventListener("click",()=>openPanel(wrapper),{signal});
    trigger.addEventListener("keydown",event=>{
      if(event.key==="ArrowDown"||event.key==="ArrowUp"){
        event.preventDefault();
        if(active!==wrapper)openPanel(wrapper);
        const items=[...panel.querySelectorAll("button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]")];
        (event.key==="ArrowUp"?items.at(-1):items[0])?.focus({preventScroll:true});
      }
    },{signal});
    panel.addEventListener("toggle",()=>{
      const isOpen=panel.matches(":popover-open");
      trigger.setAttribute("aria-expanded",String(isOpen));
      if(!isOpen&&active===wrapper)active=null;
      else if(isOpen)active=wrapper;
    },{signal});
    for(const element of [trigger,panel]){
      element.addEventListener("pointerenter",clearLeave,{signal});
      element.addEventListener("pointerleave",event=>scheduleLeave(wrapper,event),{signal});
    }
  });

  system.addEventListener("click",event=>{
    if(event.target.closest(".command-menu-panel button:not([data-menu-keep-open])"))closePanel(false);
  },{signal});
  system.addEventListener("change",event=>{
    if(event.target.closest(".command-menu-panel select,.command-menu-panel input:not([type=hidden])"))closePanel(false);
  },{signal});
  documentRef.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&active){event.preventDefault();event.stopPropagation();closePanel(true);return;}
    if(!active||(event.key!=="ArrowDown"&&event.key!=="ArrowUp"))return;
    const panel=getParts(active).panel;
    if(!event.target.closest(".command-menu-panel")||!event.target.matches("button"))return;
    const items=[...panel.querySelectorAll("button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]")];
    const index=items.indexOf(event.target);
    const delta=event.key==="ArrowDown"?1:-1;
    items[(index+delta+items.length)%items.length]?.focus({preventScroll:true});
    event.preventDefault();
  },{signal});
  view.addEventListener("resize",()=>position(active),{signal});
  view.addEventListener("scroll",()=>position(active),{capture:true,passive:true,signal});
  return ()=>{closePanel(false);abort.abort();};
}
