# Verification baseline — 2 November 2026

Implementation commit: `7dceb999bc58ca1ee0fdba85a177913d8da46375` on `codex/adigunlightdesign-m0-foundation`, draft PR #1. This is not a release or milestone acceptance certificate.

| Check | Observed result |
| --- | --- |
| Runtime | Node v24.13.1 |
| `npm test` | 147 passed, 0 failed, 0 skipped |
| `npm run check` | Project contract check passed |
| `npm run build` | Static build completed |
| Hosted CI for implementation commit | Two completed successful runs |

Hosted evidence: [run 41517566743](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/41517566743), [run 41517555790](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/41517555790).

The suite covers domain behavior and mocked rendering/browser adapters, including recent canvas geometry/dragging/export, cue timing/keyframes/tracks, virtual DMX feedback, native action validation and preview confirmation. These checks do not prove real browser operation, accessibility, rendered pixel quality, performance on target hardware or exact matching to the supplied desktop image.

No browser visual acceptance was performed. Physical DMX, live AI-provider communication, manufacturer fixture compatibility, advanced interchange compatibility and production deployment are not established by this verification. Main remains separate from the draft implementation branch.
