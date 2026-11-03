import test from "node:test";
import assert from "node:assert/strict";
import {openAccountDialog} from "../src/ui/account-dialog.js";
import {translate} from "../src/i18n.js";
function surface(){
  const handlers={},button={disabled:false},password={value:"test-only-password"},error={},signOut={};let focused=false;
  const form={elements:{email:{value:"test@example.invalid"},password},querySelector:()=>button};
  const dialog={innerHTML:"",setAttribute(){},showModal(){},addEventListener:(event,handler)=>handlers[event]=handler,close(){this.closed=true;handlers.close();},remove(){this.removed=true;},querySelector(selector){if(selector==="[data-account-error]")return error;if(selector==="[data-account-signin]")return this.innerHTML.includes("data-account-signin")?form:null;return this.innerHTML.includes("data-account-signout")?signOut:null;}};
  return {documentRef:{createElement:()=>dialog,body:{append(){}},querySelector:()=>({focus(){focused=true;}})},dialog,form,password,error,button,signOut,get focused(){return focused;}};
}
test("failed sign-in clears the password reports localized error and preserves the form",async()=>{
  const s=surface();openAccountDialog({account:{configured:true,user:null,signIn:async()=>{throw new Error("authSignInFailed");}},t:key=>translate("de",key),documentRef:s.documentRef});
  await s.form.onsubmit({preventDefault(){}});assert.equal(s.password.value,"");assert.equal(s.button.disabled,false);assert.equal(s.error.textContent,translate("de","authSignInFailed"));assert.ok(!s.dialog.closed);
});
test("successful sign-in closes the panel returns focus and never renders the password",async()=>{
  const s=surface();let signedIn=false;openAccountDialog({account:{configured:true,user:null,signIn:async(email,password)=>{assert.equal(email,"test@example.invalid");assert.equal(password,"test-only-password");signedIn=true;}},t:key=>translate("en",key),documentRef:s.documentRef});
  assert.ok(!s.dialog.innerHTML.includes("test-only-password"));await s.form.onsubmit({preventDefault(){}});assert.equal(signedIn,true);assert.equal(s.password.value,"");assert.equal(s.dialog.closed,true);assert.equal(s.dialog.removed,true);assert.equal(s.focused,true);
});
