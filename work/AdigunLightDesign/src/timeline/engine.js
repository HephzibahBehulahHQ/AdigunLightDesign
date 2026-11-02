const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
export const interpolate = (from, to, progress) => from + (to - from) * clamp(progress);

export function createCue(fixtures, { id = crypto.randomUUID(), name = `Look ${Date.now()}`, duration = 5, fade = 1 } = {}) {
  return { id, name, duration, fade, delay:0, targets:fixtures.map((fixture) => ({ fixtureId:fixture.id, properties:structuredClone(fixture.properties) })), keyframes:[{ time:0, value:"start" }, { time:duration, value:"target" }] };
}

export function evaluateCue(sourceFixtures, cue, elapsedSeconds) {
  const progress = cue.fade <= 0 ? 1 : clamp(elapsedSeconds / cue.fade);
  return sourceFixtures.map((fixture) => {
    const target = cue.targets.find((entry) => entry.fixtureId === fixture.id);
    if (!target) return fixture;
    const properties = { ...fixture.properties };
    for (const [key, end] of Object.entries(target.properties)) properties[key] = Math.round(interpolate(fixture.properties[key] ?? 0, end, progress));
    return { ...fixture, properties };
  });
}

export function cueProgress(cue, elapsedSeconds) { return clamp(elapsedSeconds / Math.max(cue.duration, .001)); }
