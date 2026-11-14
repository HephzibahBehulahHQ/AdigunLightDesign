import {escapeHtml as esc} from "./html.js";
import {icon} from "./icons.js";
import {supportedLocales,localeNames} from "../i18n.js";

const HELP_DOCUMENT_URL="https://github.com/HephzibahBehulahHQ/AdigunLightDesign/blob/main/docs/HELP.md";

export function topMenuMarkup({t,locale,saved,user=null}){
  const signedIn=Boolean(user?.id && user.is_anonymous===false);
  const button=(id,name)=>`<button id="${id}" class="top-menu-button" type="button" title="${esc(t(name))}" aria-label="${esc(t(name))}">${icon(name)}</button>`;
  return `<div class="utility-controls top-menu"><span class="header-save-status ${saved ? "is-saved" : ""}">${t(saved ? "savedLocally" : "sessionOnly")}</span><button id="account-menu" class="top-menu-button" type="button" title="${esc(t(signedIn ? "signedInAccount" : "guestAccount"))}" aria-label="${esc(t(signedIn ? "signedInAccount" : "guestAccount"))}"><span class="user-symbol">${icon("user")}<span class="user-status-dot ${signedIn ? "is-signed-in" : "is-guest"}" aria-hidden="true"></span></span></button><label class="language top-menu-button" title="${esc(t("language"))}: ${esc(localeNames[locale])}"><span>${icon("globe")}</span><select id="locale" aria-label="${esc(t("language"))}">${supportedLocales.map(code=>`<option value="${code}" ${code===locale ? "selected" : ""}>${localeNames[code]}</option>`).join("")}</select></label>${button("settings-menu","settings")}${button("search-menu","search")}${button("help-menu","help")}</div>`;
}
export function searchProject(project,query){
  if(typeof query!=="string" || !query.trim())return [];
  const needle=query.trim().slice(0,200).toLocaleLowerCase(),results=[];
  const add=(kind,item,context={})=>{if(results.length<30 && String(item.name ?? item.text ?? item.type).toLocaleLowerCase().includes(needle))results.push({kind,id:item.id,name:String(item.name ?? item.text ?? item.type),...context});};
  project.fixtures.forEach(item=>add("fixture",item));project.palettes.forEach((palette,index)=>{add("palette",palette);if(index===0)palette.colors.forEach(item=>add("swatch",item,{paletteId:palette.id}));});
  project.cues.forEach(item=>add("cue",item));const scene=project.scenes[0];(scene?.canvasObjects ?? []).forEach(item=>add("object",item,{sceneId:scene.id}));
  return results;
}
export function bindTopMenu({documentRef=document,project,t,onSelect,onAccount}){
  const dialog=documentRef.createElement("dialog");
  dialog.className="top-menu-dialog";
  dialog.setAttribute("aria-label",t("help"));
  documentRef.body.append(dialog);
  const view=documentRef.defaultView,abort=new view.AbortController(),signal=abort.signal;
  let activeKind=null,activeTrigger=null,leaveTimer=0;
  const close=(restoreFocus=false)=>{
    view.clearTimeout(leaveTimer);leaveTimer=0;
    const trigger=activeTrigger;
    if(dialog.open)dialog.close();
    activeKind=null;activeTrigger=null;
    if(restoreFocus)trigger?.focus({preventScroll:true});
  };
  const place=()=>{
    if(!dialog.open||!activeTrigger)return;
    const anchor=activeTrigger.getBoundingClientRect(),box=dialog.getBoundingClientRect();
    const width=box.width||Math.min(480,view.innerWidth-24),height=Math.min(dialog.scrollHeight,view.innerHeight-16);
    const left=Math.max(8,Math.min(anchor.right-width,view.innerWidth-width-8));
    let top=anchor.bottom+6;
    if(top+height>view.innerHeight-8)top=Math.max(8,anchor.top-height-6);
    dialog.style.left=`${left}px`;dialog.style.top=`${top}px`;
    dialog.style.maxHeight=`${Math.max(140,view.innerHeight-16)}px`;
  };
  const hideOtherPopovers=()=>documentRef.querySelectorAll("[popover]").forEach(popover=>{if(popover.matches(":popover-open"))popover.hidePopover();});
  const show=(kind,trigger)=>{
    if(activeKind===kind&&dialog.open){close(false);return;}
    close(false);hideOtherPopovers();
    dialog.innerHTML=`<form method="dialog"><button class="menu-dialog-close" aria-label="${esc(t("close"))}">×</button></form><h2>${t(kind)}</h2>${kind==="search" ? `<label>${t("searchProject")}<input type="search" maxlength="200" data-project-search /></label><div data-search-results></div>` : kind==="settings" ? `<button data-theme-toggle>${t("appearance")}</button>` : kind==="guestAccount" ? `<p>${t("accountUnavailable")}</p>` : `<p>${t("topHelpText")}</p><a href="${HELP_DOCUMENT_URL}" target="_blank" rel="noopener noreferrer">${t("help")}</a>`}`;
    activeKind=kind;activeTrigger=trigger;dialog.show();place();trigger.setAttribute("aria-expanded","true");
    const input=dialog.querySelector("[data-project-search]");
    if(input){input.focus({preventScroll:true});input.oninput=()=>{const results=searchProject(project,input.value),host=dialog.querySelector("[data-search-results]");host.innerHTML=results.map((item,index)=>`<button data-search-index="${index}">${esc(item.name)} <small>· ${esc(t(item.kind==="object" ? "designCanvas" : item.kind==="cue" ? "timeline" : item.kind==="fixture" ? "fixtureLabel" : "palette"))}</small></button>`).join("") || `<p>${t("noSearchResults")}</p>`;host.querySelectorAll("[data-search-index]").forEach(button=>button.onclick=()=>{close(false);onSelect(results[Number(button.dataset.searchIndex)]);});};}
    const theme=dialog.querySelector("[data-theme-toggle]");if(theme)theme.onclick=()=>{close(false);documentRef.querySelector("#theme").click();};
  };
  const scheduleLeave=(event)=>{
    if(event.pointerType!=="mouse")return;
    view.clearTimeout(leaveTimer);
    leaveTimer=view.setTimeout(()=>{if(!dialog.matches(":hover")&&!activeTrigger?.matches(":hover"))close(false);},220);
  };
  dialog.addEventListener("pointerenter",()=>{view.clearTimeout(leaveTimer);},{signal});
  dialog.addEventListener("pointerleave",scheduleLeave,{signal});
  dialog.addEventListener("close",()=>{if(dialog.open)return;if(activeTrigger)activeTrigger.setAttribute("aria-expanded","false");activeKind=null;activeTrigger=null;},{signal});
  dialog.addEventListener("click",event=>{if(event.target.closest("a[href]"))close(false);},{signal});
  const entries=[["account-menu","guestAccount"],["settings-menu","settings"],["search-menu","search"],["help-menu","help"]];
  const triggers=entries.map(([id,kind])=>({element:documentRef.querySelector(`#${id}`),id,kind}));
  for(const {element,id,kind} of triggers){
    if(!element)continue;
    element.setAttribute("aria-haspopup","dialog");element.setAttribute("aria-expanded","false");
    element.addEventListener("pointerenter",()=>{view.clearTimeout(leaveTimer);},{signal});
    element.addEventListener("pointerleave",scheduleLeave,{signal});
    element.onclick=()=>{if(id==="account-menu"&&onAccount){close(false);onAccount();}else show(kind,element);};
  }
  documentRef.addEventListener("pointerdown",event=>{
    if(!dialog.open||dialog.contains(event.target)||triggers.some(item=>item.element===event.target||item.element?.contains(event.target)))return;
    close(false);
  },{capture:true,signal});
  documentRef.addEventListener("keydown",event=>{if(event.key==="Escape"&&dialog.open){event.preventDefault();event.stopPropagation();close(true);}}, {signal});
  view.addEventListener("resize",place,{signal});
  view.addEventListener("scroll",place,{capture:true,passive:true,signal});
  return ()=>{close(false);abort.abort();dialog.remove();};
}
