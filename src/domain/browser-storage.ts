export function readBrowserStorage(key:string,storage:()=>Pick<Storage,"getItem">=()=>globalThis.localStorage): {ok:true;value:string|null}|{ok:false;value:null} {
  try {return {ok:true,value:storage().getItem(key)};}
  catch {return {ok:false,value:null};}
}
export function writeBrowserStorage(key:string,value:string,storage:()=>Pick<Storage,"setItem">=()=>globalThis.localStorage): {ok:true}|{ok:false} {
  try {storage().setItem(key,value);return {ok:true};}
  catch {return {ok:false};}
}
