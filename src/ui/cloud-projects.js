import {escapeHtml as esc} from "./html.js";

export function cloudProjectsMarkup(t) {
  return `<section class="cloud-projects">
    <h3>${esc(t("cloudProjects"))}</h3>
    <p>${esc(t("cloudProjectHint"))}</p>
    <button type="button" data-cloud-list>${esc(t("cloudList"))}</button>
    <button type="button" data-cloud-copy>${esc(t("cloudCopy"))}</button>
    <label>${esc(t("cloudRecent"))}<select data-cloud-project disabled></select></label>
    <button type="button" data-cloud-open disabled>${esc(t("cloudOpen"))}</button>
    <button type="button" data-cloud-update disabled>${esc(t("cloudUpdate"))}</button>
    <p role="status" data-cloud-status></p>
  </section>`;
}

export function bindCloudProjects(dialog,{projects,t,getProject,onOpen}) {
  const select=dialog.querySelector("[data-cloud-project]");
  const list=dialog.querySelector("[data-cloud-list]");
  const copy=dialog.querySelector("[data-cloud-copy]");
  const open=dialog.querySelector("[data-cloud-open]");
  const update=dialog.querySelector("[data-cloud-update]");
  const status=dialog.querySelector("[data-cloud-status]");
  let rows=[],busy=false;
  const selected=()=>rows.find(row=>row.id===select.value);
  const refreshControls=()=>{
    list.disabled=copy.disabled=busy;
    select.disabled=busy || rows.length===0;
    open.disabled=update.disabled=busy || !selected();
  };
  function showRows(next,id) {
    rows=next;
    select.replaceChildren(...rows.map(row=>{
      const option=select.ownerDocument.createElement("option");
      option.value=row.id;
      option.textContent=`${row.title} · r${row.revision}`;
      return option;
    }));
    if(id) select.value=id;
  }
  async function run(operation) {
    if(busy) return;
    busy=true;
    status.textContent=t("cloudWorking");
    refreshControls();
    try { status.textContent=t(await operation()); }
    catch(error) { status.textContent=t(error.message); }
    finally { busy=false;refreshControls(); }
  }
  select.onchange=refreshControls;
  list.onclick=()=>run(async()=>{
    showRows(await projects.list());
    return rows.length ? "cloudListLoaded" : "cloudEmpty";
  });
  copy.onclick=()=>run(async()=>{
    const saved=await projects.saveCopy(getProject());
    showRows([saved,...rows],saved.id);
    return "cloudSaved";
  });
  update.onclick=()=>run(async()=>{
    const row=selected();
    if(!row) return "cloudEmpty";
    const saved=await projects.update(row.id,row.revision,getProject());
    showRows(rows.map(item=>item.id===saved.id ? saved : item),saved.id);
    return "cloudSaved";
  });
  open.onclick=()=>run(async()=>{
    const row=selected();
    if(!row) return "cloudEmpty";
    const project=await projects.open(row.id);
    if(dialog.open){
      onOpen(project);
      dialog.close();
    }
    return "cloudListLoaded";
  });
}
