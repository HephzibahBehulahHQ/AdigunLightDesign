import { createLuxChatSession } from "../ai/chat-session.js";
import { escapeHtml as esc } from "./html.js";

export function createLuxServicePanel({getProject,getLocale,translate,onPreview,onError,imageAssets,fetchImpl=globalThis.fetch,findContainer=()=>document.querySelector("[data-lux-service]"),onNotify=()=>{}}) {
  const session=createLuxChatSession({fetchImpl});
  let reply=null,error="",question="",epoch=0;
  function mount(container) {
    const floatingPanel=container.closest(".floating-bot");
    floatingPanel?.querySelector(":scope > .bot-composer")?.remove();
    const t=(key)=>translate(getLocale(),key),state=session.status;
    const message=container.closest(".lux-panel")?.querySelector(".lux-message");
    if(message && state.configured){message.querySelector("b").textContent=t("luxServiceConfigured");message.querySelector("p").textContent=t("luxServiceNotice");}
    container.innerHTML=`<details class="lux-service-settings"><summary>${t("luxServiceSettings")}</summary><p>${t("luxServiceNotice")}</p><p>${t(state.configured ? "luxServiceConfigured" : "luxServiceDisconnected")}</p><form data-lux-settings><label>${t("luxServiceUrl")}<input name="endpoint" type="url" required value="${esc(state.endpoint ?? "")}" placeholder="https://your-service.example/api/lux" /></label><label>${t("luxServiceToken")}<input name="token" type="password" required minlength="32" maxlength="512" autocomplete="off" /></label><button>${t("luxConfigure")}</button><button type="button" data-lux-disconnect>${t("luxDisconnect")}</button></form></details><div role="status" aria-live="polite">${state.pending ? t("luxWaiting") : esc(error)}</div>${reply ? `<div class="lux-service-reply"><p>${esc(reply.answer)}</p>${reply.calls.map((call,index)=>`<button type="button" data-lux-review="${index}">${t("luxReviewSuggestion")}: ${esc(call.name)}</button>`).join("")}<pre data-lux-result></pre></div>` : ""}<form data-lux-request><label>${t("askLux")}<textarea name="question" required maxlength="4000" aria-label="${t("askLux")}" placeholder="${t("askLux")}">${esc(question)}</textarea></label><label class="lux-consent"><input name="consent" type="checkbox" required />${t("luxContextConsent")}</label><button ${!state.configured || state.pending ? "disabled" : ""}>${t("sendLux")}</button></form>`;
    container.querySelector("[data-lux-settings]").onsubmit=(event)=>{
      event.preventDefault();const form=event.currentTarget;
      try {session.configure({endpoint:form.elements.endpoint.value,accessToken:form.elements.token.value});epoch++;reply=null;error="";}
      catch(e){error=e.message;}
      mount(container);
    };
    container.querySelector("[data-lux-disconnect]").onclick=()=>{epoch++;session.disconnect();reply=null;error="";if(message){message.querySelector("b").textContent=`${t("luxBrand")} · ${t("offline")}`;message.querySelector("p").textContent=t("luxUnavailable");}mount(container);};
    container.querySelector('[name="question"]').oninput=(event)=>{question=event.target.value;};
    const requestForm=container.querySelector("[data-lux-request]");
    requestForm.onsubmit=async(event)=>{
      event.preventDefault();const form=event.currentTarget;
      question=form.elements.question.value;const consent=form.elements.conse