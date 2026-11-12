import {parseProjectJson} from "../domain/import-project.ts";

const metadata="id,title,revision,updated_at";
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

function cloudDocument(project) {
  let source;
  try { source=JSON.stringify(project); }
  catch { throw new Error("cloudInvalidProject"); }
  if(typeof source!=="string" || new TextEncoder().encode(source).length>5_000_000) {
    throw new Error("cloudInvalidProject");
  }
  const parsed=parseProjectJson(source);
  if(!parsed.valid || Array.from(parsed.project.name).length>200) throw new Error("cloudInvalidProject");
  return parsed.project;
}

function record(row) {
  if(!row || typeof row.id!=="string" || !uuid.test(row.id) ||
    typeof row.title!=="string" || !Number.isSafeInteger(row.revision) || row.revision<1) {
    throw new Error("cloudRequestFailed");
  }
  return {id:row.id,title:row.title,revision:row.revision,updatedAt:row.updated_at};
}

function projectId(id) {
  if(typeof id!=="string" || !uuid.test(id)) throw new Error("cloudRequestFailed");
  return id;
}

async function response(query) {
  let result;
  try { result=await query; }
  catch { throw new Error("cloudRequestFailed"); }
  if(result.error?.code==="PGRST106") throw new Error("cloudSchemaUnavailable");
  if(result.error) throw new Error("cloudRequestFailed");
  return result.data;
}

export function createCloudProjectStore({client,withUser}) {
  const table=()=>client.schema("adigunlightdesign").from("projects");
  return {
    list() {
      return withUser(async owner=>{
        const rows=await response(table().select(metadata).eq("owner_id",owner)
          .order("updated_at",{ascending:false}).limit(50));
        if(!Array.isArray(rows)) throw new Error("cloudRequestFailed");
        return rows.map(record);
      });
    },
    saveCopy(project) {
      const document=cloudDocument(project);
      return withUser(async owner=>record(await response(table()
        .insert({owner_id:owner,title:document.name,document}).select(metadata).single())));
    },
    update(id,revision,project) {
      const document=cloudDocument(project);
      if(!Number.isSafeInteger(revision) || revision<1) throw new Error("cloudConflict");
      return withUser(async owner=>{
        const row=await response(table().update({title:document.name,document})
          .eq("id",projectId(id)).eq("owner_id",owner).eq("revision",revision)
          .eq("document->>id",document.id).select(metadata).maybeSingle());
        if(!row) throw new Error("cloudConflict");
        return record(row);
      });
    },
    open(id) {
      return withUser(async owner=>{
        const row=await response(table().select("document").eq("id",projectId(id))
          .eq("owner_id",owner).single());
        return cloudDocument(row?.document);
      });
    }
  };
}
