import {patchFixture} from "../dmx/engine.ts";
import type {Fixture} from "../dmx/engine.ts";

type FixtureRecord = Fixture;

interface FixtureGroupRecord {
  fixtureIds: string[];
  [property: string]: unknown;
}

interface FixturePatchRecord {
  fixtureId: string;
  [property: string]: unknown;
}

interface CueTargetRecord {
  fixtureId: string;
  [property: string]: unknown;
}

interface CueKeyframeRecord {
  fixtureId: string;
  [property: string]: unknown;
}

interface CueRecord {
  targets: CueTargetRecord[];
  channelKeyframes?: CueKeyframeRecord[];
  [property: string]: unknown;
}

interface FixtureProject {
  fixtures: FixtureRecord[];
  patches: FixturePatchRecord[];
  fixtureGroups?: FixtureGroupRecord[];
  cues: CueRecord[];
}

export interface DuplicateFixtureOptions {
  id?: string;
  name?: string;
}

export function duplicateFixture(
  project: FixtureProject,
  fixtureId: string,
  {id = crypto.randomUUID(), name}: DuplicateFixtureOptions = {},
): FixtureProject {
  const source = project.fixtures.find((fixture) => fixture.id === fixtureId);
  if (!source || typeof id !== "string" || !id.trim() || project.fixtures.some((fixture) => fixture.id === id)) {
    throw new Error("Fixture source or new identity is invalid.");
  }
  const result = structuredClone(project);
  const copy = structuredClone(source);
  copy.id = id;
  copy.name = name ?? `${source.name} (copy)`;
  if (typeof copy.name !== "string" || !copy.name.trim()) throw new Error("Fixture name must not be empty.");
  copy.transform = {...copy.transform, x: (copy.transform?.x ?? 0) + .5};
  copy.patchAssignment = null;
  result.fixtures = patchFixture([...result.fixtures, copy], id, source.patchAssignment?.universe ?? 1);
  return result;
}

export function deleteFixture(project: FixtureProject, fixtureId: string): FixtureProject {
  if (!project.fixtures.some((fixture) => fixture.id === fixtureId)) throw new Error("Fixture was not found.");
  const result = structuredClone(project);
  result.fixtures = result.fixtures.filter((fixture) => fixture.id !== fixtureId);
  result.patches = result.patches.filter((patch) => patch?.fixtureId !== fixtureId);
  if (result.fixtureGroups) {
    result.fixtureGroups = result.fixtureGroups
      .map((group) => ({...group, fixtureIds: group.fixtureIds.filter((id) => id !== fixtureId)}))
      .filter((group) => group.fixtureIds.length);
  }
  result.cues = result.cues.map((cue) => ({
    ...cue,
    targets: cue.targets.filter((target) => target.fixtureId !== fixtureId),
    ...(cue.channelKeyframes
      ? {channelKeyframes: cue.channelKeyframes.filter((frame) => frame.fixtureId !== fixtureId)}
      : {}),
  }));
  return result;
}

