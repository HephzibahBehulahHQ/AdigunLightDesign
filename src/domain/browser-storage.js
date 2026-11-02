export function readBrowserStorage(key,storage=()=>globalThis.localStorage) {
  try {return {ok:true,value:storage().getItem(key)};}
  catch {return {ok:false,value:null};}
}
export function writeBrowserStorage(key,value,storage=()=>globalThis.localStorage) {
  try {storage().setItem(key,value);return {ok:true};}
  catch {return {ok:false};}
}
