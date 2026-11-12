export interface FixtureGroup {
  id: string;
  name: string;
  fixtureIds: string[];
}

interface FixtureRef {
  id: string;
}

interface SaveFixtureGroupInput {
  id?: string;
  name: string;
  fixtureIds: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateFixtureGroups(
  groups: unknown,
  fixtures: readonly (FixtureRef | null | undefined)[],
): groups is FixtureGroup[] {
  if (!Array.isArray(groups)) return false;
  const ids = new Set<string>();
  const fixtureIds = new Set(fixtures.filter((fixture): fixture is FixtureRef => Boolean(fixture)).map((fixture) => fixture.id));
  return groups.every((value: unknown) => {
    if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim() || ids.has(value.id)
      || typeof value.name !== "string" || !value.name.trim() || !Array.isArray(value.fixtureIds)) return false;
    const memberIds: unknown[] = value.fixtureIds;
    if (!memberIds.length || new Set(memberIds).size !== memberIds.length
      || !memberIds.every((id: unknown) => typeof id === "string" && fixtureIds.has(id))) return false;
    ids.add(value.id);
    return true;
  });
}

export function saveFixtureGroup(
  groups: readonly FixtureGroup[],
  fixtures: readonly (FixtureRef | null | undefined)[],
  {id = crypto.randomUUID(), name, fixtureIds}: SaveFixtureGroupInput,
): FixtureGroup[] {
  const group: FixtureGroup = {id, name: name.trim(), fixtureIds: [...fixtureIds]};
  const result = groups.some((item) => item.id === id)
    ? groups.map((item) => item.id === id ? group : item)
    : [...groups, group];
  if (!validateFixtureGroups(result, fixtures)) throw new Error("Fixture group requires a name and unique existing fixtures.");
  return result;
}

export function groupFixtures<T extends FixtureRef>(fixtures: T[], groups: readonly FixtureGroup[], groupId?: string | null): T[] {
  if (!groupId) return fixtures;
  const group = groups.find((item) => item.id === groupId);
  if (!group) throw new Error("Fixture group was not found.");
  return fixtures.filter((fixture) => group.fixtureIds.includes(fixture.id));
}

