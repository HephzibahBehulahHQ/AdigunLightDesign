import {createBotWindowStore,botWindowRect} from "./bot-window-state.js";

export function createFloatingBot({getProjectId,getLocale,translate,getUserId=()=>"guest",documentRef=document,windowRef=window,storage=()=>globalThis.localStorage}){
  let store=null,scope="",host=null,drag=null;
  const viewport=()=>({width:windowRef.innerWidth,height:windowRef.innerHeight}),t=key=>translate(getLocale(),key);
  const ai=()=>documentRef.querySelector('[data-module="copilot"]');
  function paint(){
    if(!host || !store)return;
    const state=store.state,rect=botWindowRect(state,viewport());host.hidden=!state.open;
    host.classList.toggle("is-minimized",state.mode==="minimized");
    for(const [key,value] of Object.entries({left:rect.x,top:rect.y,width:rect.width,height:rect.height}))host.style[key]=`${value}px`;
    const maximize=host.querySelector("[data-bot-maximize]");maximize.textContent=state.mode==="maximized" ? "❐" : "□";maximize.title=t(state.mode==="maximized" ? "botRestore" : "botMaximize");maximize.setAttribute("aria-label",maximize.title);
    const minimize=host.querySelector("[data-bot-minimize]");minimize.title=t(state.mode==="minimized" ? "botRestore" : "botMinimize");minimize.setAttribute("aria-label",minimize.title);
    const button=ai();if(button){button.classList.toggle("has-bot-unread",state.unread);button.setAttribute("aria-expanded",String(state.open));button.setAttribute("aria-controls","floating-lux-window");}
  }
  function dispatch(action,options){const result=store.dispatch(action,options);paint();if(!result.persisted && options?.persist!==false){const status=documentRef.querySelector("#status");if(status)status.textContent=t("botLayoutNotSaved");}}
  function close(){dispatch({type:"close"});ai()?.focus();}
  function bindPointer(element,kind){
    element.onpointerdown=event=>{
      if(event.button!==0 || drag || (kind==="move" && event.target.closest("button")) || store.state.mode==="maximized" || viewport().width<=670)return;
      event.preventDefault();drag={kind,id:event.pointerId,x:event.clientX,y:event.clientY,rect:store.state.rect,element};element.setPointerCapture(event.pointerId);
    };
    element.onpointermove=event=>{if(!drag || drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;dispatch(kind==="move" ? {type:"move",x:drag.rect.x+dx,y:drag.rect.y+dy} : {type:"resize",width:drag.rect.width+dx,height:drag.rect.height+dy},{persist:false});};
    const end=event=>{if(!drag || drag.id!==event.pointerId)return;if(event.type==="pointerup")element.onpointermove(event);const previous=drag;drag=null;if(event.type!=="pointerup"){dispatch({type:"move",x:previous.rect.x,y:previous.rect.y},{persist:false});dispatch({type:"resize",width:previous.rect.width,height:previous.rect.height},{persist:false});}dispatch({type:"persist"});if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);};
    element.onpointerup=end;element.onpointercancel=end;element.onlostpointercapture=end;
    element.onkeydown=event=>{if(event.target!==element || !["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;event.preventDefault();const step=event.shiftKey ? 10 : 1,dx=event.key==="ArrowLeft" ? -step : event.key==="ArrowRight" ? step : 0,dy=event.key==="ArrowUp" ? -step : event.key==="ArrowDown" ? step : 0,rect=store.state.rect;dispatch(kind==="move" ? {type:"move",x:rect.x+dx,y:rect.y+dy} : {type:"resize",width:rect.width+dx,height:rect.height+dy});};
  }
  const onResize=()=>{if(store)dispatch({type:"viewport"});};windowRef.addEventListener("resize",onResize);
  return {
    mount(panel){
      host=panel;const nextScope=`${getUserId()}/${getProjectId()}`;if(scope!==nextScope){scope=nextScope;store=createBotWindowStore({projectId:getProjectId(),userId:getUserId(),viewport,storage});}
      host.classList.add("floating-bot");host.id="floating-lux-window";host.setAttribute("role","complementary");host.setAttribute("aria-label",t("luxTitle"));
      documentRef.body.classList.add("has-floating-bot");
      const header=host.querySelector(".lux-heading");header.tabIndex=0;header.title=t("botMoveHelp");
      const closeButton=host.querySelector("#toggle-lux");closeButton.title=t("closePanel");closeButton.setAttribute("aria-label",closeButton.title);closeButton.onclick=close;
      for(const [key,label,text] of [["minimize","botMinimize","−"],["maximize","botMaximize","□"]]){const button=documentRef.createElement("button");button.type="button";button.dataset[`bot${key[0].toUpperCase()+key.slice(1)}`]="";button.textContent=text;button.title=t(label);button.setAttribute("aria-label",button.title);button.onclick=()=>dispatch({type:key});header.insertBefore(button,closeButton);}
      const body=documentRef.createElement("div");body.className="bot-window-body";for(const child of [...host.children])if(child!==header)body.append(child);host.append(body);
      const handle=documentRef.createElement("button");handle.type="button";handle.className="bot-resize-handle";handle.textContent="↘";handle.title=t("botResizeHelp");handle.setAttribute("aria-label",handle.title);host.append(handle);
      bindPointer(header,"move");bindPointer(handle,"resize");
      host.onkeydown=event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();close();}};paint();
      host.onfocusin=()=>{if(store.state.unread)dispatch({type:"unread",value:false});};
    },
    open(){if(!store)return;dispatch({type:"open"});host.querySelector('[data-lux-request] textarea')?.focus();},
    notify(){if(!store)return;const reading=store.state.open && store.state.mode!=="minimized" && host.contains(documentRef.activeElement);dispatch({type:"unread",value:!reading});const status=documentRef.querySelector("#status");if(status)status.textContent=t("botNewSuggestion");},
    dispose(){windowRef.removeEventListener("resize",onResize);host=null;drag=null;}
  };
}
