export function validateFixtureGroups(groups,fixtures) {
  if (!Array.isArray(groups)) return false;
  const ids=new Set(),fixtureIds=new Set(fixtures.filter(Boolean).map((fixture)=>fixture.id));
  return groups.every((group)=>{
    if (!group || typeof group.id!=="string" || !group.id.trim() || ids.has(group.id) || typeof group.name!=="string" || !group.name.trim() || !Array.isArray(group.fixtureIds) || !group.fixtureIds.length || new Set(group.fixtureIds).size!==group.fixtureIds.length || !group.fixtureIds.every((id)=>fixtureIds.has(id))) return false;
    ids.add(group.id);return true;
  });
}
export function saveFixtureGroup(groups,fixtures,{id=crypto.randomUUID(),name,fixtureIds}) {
  const group={id,name:typeof name==="string" ? name.trim() : name,fixtureIds:[...fixtureIds]};
  const result=groups.some((item)=>item.id===id) ? groups.map((item)=>item.id===id ? group : item) : [...groups,group];
  if (!validateFixtureGroups(result,fixtures)) throw new Error("Fixture group requires a name and unique existing fixtures.");
  return result;
}
export function groupFixtures(fixtures,groups,groupId) {
  if (!groupId) return fixtures;
  const group=groups.find((item)=>item.id===groupId);
  if (!group) throw new Error("Fixture group was not found.");
  return fixtures.filter((fixture)=>group.fixtureIds.includes(fixture.id));
}
