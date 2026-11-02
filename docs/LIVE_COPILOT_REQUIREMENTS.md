# Live Adigun co-pilot — additional required scope

Status: required, not implemented or accepted.

Incremental implementation: `src/ai/live-copilot.js` provides a subscribed state
feed, defensive snapshots and revision tracking. Editor renders publish current
project, selection and playback-active state. The local analyzer reports actual
unpatched fixtures as optional patch-review offers, never hardware faults, and
asks a session goal when missing. The scheduler supports a 600 ms debounce,
25-second minimum suggestion interval, two-minute suppression, typing/drag
suppression and an off switch. Three automated tests cover those foundations.
The scheduler is now mounted in the Lux panel with four-language controls,
session goal entry, dismissal and explanation. Pointer/input activity, focused
editing fields and hidden pages suppress offers. Accept is disabled until real
authentication exists; no live suggestion changes or saves the document.
See `HELP.md`. Selected-object explanations, broader analysis, authenticated
acceptance and browser verification remain incomplete.

Panel event-surface tests cover drag/cancel, typing cooldown, focused fields,
hidden pages, dismissal, off state, cleanup and disabled acceptance. Project
switches now clear session goals in both the scheduler and panel without
resetting the global suggestion rate limit. These are mocked interaction tests,
not browser layout or accessibility acceptance.

This extends the original master specification and exact desktop visual target;
it does not replace either. Authority: the user's attached continuation request,
`1d470cdc-5ca2-4abd-b333-573b5fa7a2ad/Pasted text.txt`.

## Product-specific behavior

Use actual AdigunLightDesign state: palettes, 2D objects, scenes, fixtures,
fixture selection, patch assignments, cues, virtual playback and explicitly
reported hardware connection state. Electrical ladder, motor, gate, coil, wire
and rung examples in the request are illustrative, not new product capabilities.
Do not invent wiring analysis, photometric certification or hardware feedback.
Only report a problem supported by current state and an implemented rule.

## Required implementation and acceptance evidence

- Subscribe to project mutations, selection and playback changes through a live
  state feed. Debounce analysis; do not send an AI request on every pointer move.
- Analyze relevant incomplete lighting workflows and real conflicts. Examples
  must be derived from validated domain semantics; zero intensity or no cue can
  be intentional and must not automatically be described as a fault.
- Observe editing versus idle activity. Never surface a proactive suggestion
  mid-drag or while typing. Limit suggestions to at most one per 20–30 seconds.
- Keep a session project goal, ask a calm question when needed, and use the
  answer to refine suggestions. Do not infer the user's intent as fact.
- Offer short, dismissible, non-modal suggestions inside the existing Bot panel.
  Provide Accept, Dismiss and Tell me more, plus an on/off control. Maintain the
  supplied interface target and EN/DE/Yoruba/Nigerian Pidgin localization.
- Guests may receive live suggestions. Accepting a suggestion that saves locally
  or to cloud requires real login. Until authentication exists, keep this path
  unavailable rather than treating a preference flag as authentication.
- Acceptance must preview the exact native change, require explicit approval,
  validate it, and support undo and rollback on failure. The Bot never silently
  modifies the canvas or automatically saves it. The existing local action path
  currently saves after confirmation and is not evidence of this new behavior.
- Local observation must not imply permission to upload project data. Preserve
  the existing explicit consent boundary for optional remote AI requests.
- Explain selected objects from actual current state, with honest simulation
  and hardware limitations. Do not claim a physical fixture is powered based
  only on its virtual DMX value.

## Required tests

Cover product-relevant incomplete patterns and real conflicts, ambiguous-goal
questions, live updates after placement/movement/deletion, stale suggestions,
no suggestions while dragging or typing, rate limits, dismissal suppression,
preview/acceptance/undo/rollback, login-gated saving and zero automatic saves.
Circuit-specific example tests are replaced by equivalent lighting-domain tests,
not fabricated circuit support. Add browser verification of non-blocking behavior
and all four locales; mocked handlers alone do not establish acceptance.

## Documentation gate

Add “The live co-pilot” to `docs/HELP.md` and its table of contents when the
feature is implemented. Explain on/off, accepting, dismissing, questions, guest
access, login and saving. Until then, describe the feature as planned.
