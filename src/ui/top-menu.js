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
  const dialog=documentRef.createElement("dialog");dialog.className="top-menu-dialog";dialog.setAttribute("aria-label",t("help"));
  documentRef.body.append(dialog);
  function show(kind){
    dialog.innerHTML=`<form method="dialog"><button class="menu-dialog-close" aria-label="${esc(t("close"))}">×</button></form><h2>${t(kind)}</h2>${kind==="search" ? `<label>${t("searchProject")}<input type="search" maxlength="200" data-project-search /></label><div data-search-results></div>` : kind==="settings" ? `<button data-theme-toggle>${t("appearance")}</button>` : kind==="guestAccount" ? `<p>${t("accountUnavailable")}</p>` : `<p>${t("topHelpText")}</p><a href="${HELP_DOCUMENT_URL}" target="_blank" rel="noopener noreferrer">${t("help")}</a>`}`;
    dialog.setAttribute("aria-label",t(kind));dialog.showModal();
    const input=dialog.querySelector("[data-project-search]");if(input){input.focus();input.oninput=()=>{const results=searchProject(project,input.value),host=dialog.querySelector("[data-search-results]");host.innerHTML=results.map((item,index)=>`<button data-search-index="${index}">${esc(item.name)} <small>· ${esc(t(item.kind==="object" ? "designCanvas" : item.kind==="cue" ? "timeline" : item.kind==="fixture" ? "fixtureLabel" : "palette"))}</small></button>`).join("") || `<p>${t("noSearchResults")}</p>`;host.querySelectorAll("[data-search-index]").forEach(button=>button.onclick=()=>{dialog.close();onSelect(results[Number(button.dataset.searchIndex)]);});};}
    const theme=dialog.querySelector("[data-theme-toggle]");if(theme)theme.onclick=()=>{dialog.close();documentRef.querySelector("#theme").click();};
  }
  for(const [id,kind] of [["account-menu","guestAccount"],["settings-menu","settings"],["search-menu","search"],["help-menu","help"]])documentRef.querySelector(`#${id}`).onclick=()=>id==="account-menu" && onAccount ? onAccount() : show(kind);
  return ()=>dialog.remove();
}
