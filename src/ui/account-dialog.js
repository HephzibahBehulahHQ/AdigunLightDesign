import {escapeHtml as esc} from "./html.js";
export function openAccountDialog({account,t,documentRef=document}){
  const dialog=documentRef.createElement("dialog");dialog.className="top-menu-dialog";dialog.setAttribute("aria-label",t("accountTitle"));
  const user=account.user;
  dialog.innerHTML=`<form method="dialog"><button aria-label="${esc(t("close"))}" class="menu-dialog-close">×</button></form><h2>${t("accountTitle")}</h2>${!account.configured ? `<p>${t("authUnavailable")}</p>` : user ? `<p>${esc(user.email)}</p><button data-account-signout>${t("authSignOut")}</button>` : `<p>${t("authSessionOnly")}</p><form data-account-signin><label>${t("authEmail")}<input name="email" type="email" autocomplete="username" required maxlength="320" /></label><label>${t("authPassword")}<input name="password" type="password" autocomplete="current-password" required maxlength="1024" /></label><button>${t("authSignIn")}</button></form>`}<p role="status" aria-live="polite" data-account-error></p>`;
  documentRef.body.append(dialog);dialog.showModal();
  dialog.addEventListener("close",()=>{dialog.remove();documentRef.querySelector("#account-menu")?.focus();},{once:true});
  const form=dialog.querySelector("[data-account-signin]");if(form)form.onsubmit=async event=>{
    event.preventDefault();const button=form.querySelector("button"),password=form.elements.password;button.disabled=true;
    try{await account.signIn(form.elements.email.value,password.value);dialog.close();}
    catch(error){dialog.querySelector("[data-account-error]").textContent=t(error.message);}
    finally{password.value="";button.disabled=false;}
  };
  const signOut=dialog.querySelector("[data-account-signout]");if(signOut)signOut.onclick=async()=>{signOut.disabled=true;try{await account.signOut();dialog.close();}catch(error){dialog.querySelector("[data-account-error]").textContent=t(error.message);signOut.disabled=false;}};
  return dialog;
}
