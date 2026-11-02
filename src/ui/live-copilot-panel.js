import {createLiveCopilot} from "../ai/live-copilot.js";
import {escapeHtml as esc} from "./html.js";

export function createLiveCopilotPanel({feed,getLocale,translate,documentRef=document}) {
  let host=null,suggestion=null,enabled=true,goal="",expanded=false,timer=null;
  const t=key=>translate(getLocale(),key);
  const bot=createLiveCopilot({feed,onSuggestion(value){suggestion=value;expanded=false;paint();}});
  bot.setEnabled(true);
  const unsubscribe=feed.subscribe(()=>{suggestion=null;paint();});
  function paint(){
    if(!host?.isConnected)return;
    host.innerHTML=`<label><input data-live-enabled type="checkbox" ${enabled ? "checked" : ""} /> ${t("liveCopilot")}</label><details><summary>${t("liveProjectGoal")}</summary><form data-live-goal><label>${t("liveGoalQuestion")}<input name="goal" maxlength="1000" value="${esc(goal)}" /></label><button>${t("liveRememberGoal")}</button></form></details>${suggestion ? `<section class="live-suggestion" aria-live="polite"><p>${t(suggestion.messageKey)} ${esc(suggestion.subject ?? "")}</p><button data-live-dismiss>${t("liveDismiss")}</button><button data-live-more>${t("liveTellMore")}</button>${suggestion.kind==="offer" ? `<button disabled title="${t("liveLoginRequired")}">${t("liveAccept")}</button><small>${t("liveLoginRequired")}</small>` : ""}${expanded ? `<p>${t(suggestion.explanationKey)}</p>` : ""}</section>` : ""}`;
    host.querySelector("[data-live-enabled]").onchange=event=>{enabled=event.target.checked;bot.setEnabled(enabled);if(!enabled)suggestion=null;paint();};
    host.querySelector("[data-live-goal]").onsubmit=event=>{event.preventDefault();goal=event.currentTarget.elements.goal.value.trim();bot.setGoal(goal);if(suggestion?.kind==="question"){bot.dismiss(suggestion.id);suggestion=null;}paint();};
    const dismiss=host.querySelector("[data-live-dismiss]");if(dismiss)dismiss.onclick=()=>{bot.dismiss(suggestion.id);suggestion=null;paint();};
    const more=host.querySelector("[data-live-more]");if(more)more.onclick=()=>{expanded=!expanded;paint();};
  }
  const input=()=>bot.activity({typing:true}),down=()=>bot.activity({dragging:true}),up=()=>bot.activity({dragging:false});
  documentRef.addEventListener("input",input,true);documentRef.addEventListener("keydown",input,true);
  documentRef.addEventListener("pointerdown",down,true);documentRef.addEventListener("pointerup",up,true);documentRef.addEventListener("pointercancel",up,true);
  const blur=()=>bot.activity({dragging:false});documentRef.defaultView?.addEventListener("blur",blur);
  return {
    mount(container){host=container;paint();if(!timer)timer=setInterval(()=>{
      if(!host?.isConnected || documentRef.hidden)return;
      const active=documentRef.activeElement;
      if(active?.matches('input,textarea,select,[contenteditable="true"]'))return;
      bot.tick();
    },1000);},
    dispose(){clearInterval(timer);timer=null;bot.dispose();unsubscribe();host=null;
      documentRef.removeEventListener("input",input,true);documentRef.removeEventListener("keydown",input,true);
      documentRef.removeEventListener("pointerdown",down,true);documentRef.removeEventListener("pointerup",up,true);documentRef.removeEventListener("pointercancel",up,true);
      documentRef.defaultView?.removeEventListener("blur",blur);
    }
  };
}
