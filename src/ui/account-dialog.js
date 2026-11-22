import {bindCloudProjects,cloudProjectsMarkup} from "./cloud-projects.js";
import {escapeHtml as esc} from "./html.js";

export function openAccountDialog({account,t,getProject,onOpen,documentRef=document}){
  const dialog=documentRef.createElement("dialog");
  dialog.setAttribute("data-account-dialog","");
  dialog.className="top-menu-dialog";
  dialog.setAttribute("aria-label",t("accountTitle"));
  let email="", mode="sign-in", waiting=false;

  function render(message=""){
    const user=account.user;
    const cloud=Boolean(user && account.projects && getProject && onOpen);
    const credentials=waiting ? `<form data-account-code><label>${t("authCode")}<input name="code" type="text" inputmode="numeric" autocomplete="one-time-code" required pattern="[0-9]{6,10}" maxlength="10" /></label><button>${t("authVerifyCode")}</button><button type="button" data-account-restart>${t("authStartAgain")}</button></form>` : `<form data-account-signin><label>${t("authEmail")}<input name="email" type="email" autocomplete="username" required maxlength="254" value="${esc(email)}" /></label><label>${t(mode==="reset-password" ? "authNewPassword" : "authPassword")}<input name="password" type="password" autocomplete="${mode==="reset-password" ? "new-password" : "current-password"}" required minlength="12" maxlength="256" /></label>${mode==="reset-password" ? `<button value="reset-password">${t("authSendCode")}</button><button type="button" data-account-restart>${t("authBackToSignIn")}</button>` : `<button value="sign-in">${t("authSignIn")}</button><button value="register">${t("authRegister")}</button><button type="button" data-account-reset>${t("authForgotPassword")}</button>`}</form>`;
    const feedback=()=>dialog.querySelector("[data-account-error]");
    dialog.innerHTML=`<form method="dialog"><button aria-label="${esc(t("close"))}" class="menu-dialog-close">×</button></form><h2>${t("accountTitle")}</h2>${!account.configured ? `<p>${t("authUnavailable")}</p>` : user ? `<p>${esc(user.email)}</p><button data-account-signout>${t("authSignOut")}</button>` : credentials}${cloud ? cloudProjectsMarkup(t) : ""}<p role="status" aria-live="polite" data-account-error></p>`;
    feedback().textContent=message;
    const restart=dialog.querySelector("[data-account-restart]");
    if(restart)restart.onclick=()=>{waiting=false;mode="sign-in";render();};
    const reset=dialog.querySelector("[data-account-reset]");
    if(reset)reset.onclick=()=>{email=dialog.querySelector("[data-account-signin]").elements.email.value;mode="reset-password";render();};
    const form=dialog.querySelector("[data-account-signin]");
    if(form)form.onsubmit=async event=>{
      event.preventDefault();
      const controls=form.querySelectorAll("button");
      controls.forEach(button=>{button.disabled=true;});
      email=form.elements.email.value;
      mode=event.submitter?.value || mode;
      try{await account.begin(mode,email,form.elements.password.value);waiting=true;render(t("authCodeSent"));dialog.querySelector("[name=code]")?.focus();}
      catch(error){feedback().textContent=t(error.message);}
      finally{form.elements.password.value="";controls.forEach(button=>{button.disabled=false;});}
    };
    const codeForm=dialog.querySelector("[data-account-code]");
    if(codeForm)codeForm.onsubmit=async event=>{
      event.preventDefault();
      const controls=codeForm.querySelectorAll("button");
      controls.forEach(button=>{button.disabled=true;});
      try{
        const result=await account.verifyCode(codeForm.elements.code.value);
        if(result==="signed-in"){dialog.close();return;}
        waiting=false;mode="sign-in";
        render(t(result==="registered" ? "authRegistered" : "authPasswordReset"));
      }catch(error){
        if(error.message==="authCodeRestart" || error.message==="authProductNotAuthorized"){
          waiting=false;mode="sign-in";render(t(error.message));
        }else feedback().textContent=t(error.message);
      }finally{codeForm.elements.code.value="";controls.forEach(button=>{button.disabled=false;});}
    };
    const signOut=dialog.querySelector("[data-account-signout]");
    if(signOut)signOut.onclick=async()=>{
      signOut.disabled=true;
      try{await account.signOut();dialog.close();}
      catch(error){feedback().textContent=t(error.message);signOut.disabled=false;}
    };
    if(cloud)bindCloudProjects(dialog,{projects:account.projects,t,getProject,onOpen});
  }

  render();
  documentRef.body.append(dialog);
  dialog.showModal();
  dialog.addEventListener("close",()=>{dialog.remove();documentRef.querySelector("#account-menu")?.focus();},{once:true});
  return dialog;
}
