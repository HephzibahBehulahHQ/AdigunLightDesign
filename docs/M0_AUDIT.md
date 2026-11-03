# M0 — Repository audit and baseline

Date: 1 November 2026

## Audited source repositories

| Repository | Verified finding | Product action |
| --- | --- | --- |
| `HephzibahBehulahHQ/AdigunLightDesign` | A new public repository, default branch `main`, with only an initial commit and no application code, dependencies, workflows or product `AGENTS.md`. | Establish the product foundation on `codex/adigunlightdesign-m0-foundation`; no existing product code is replaced. |
| `HephzibahBehulahHQ/HephzibahBehulahHQ.github.io` | Corporate identity documents the five brands, corporate colors and independent-product model. No repository `AGENTS.md` was present. | Use it as a read-only corporate reference. |
| `HephzibahBehulahHQ/hb-design-system` | Contains the binding `AGENTS.md`, corporate and brand token files, identity guidance and a configuration-only universal-product template. It is not an installable UI package. | Use its verified values in product code. Do not modify this repository. |
| `HephzibahBehulahHQ/hb-elektroniker` | Documents the engineering division and its electric-cyan accent. No repository `AGENTS.md` was present. | Use it as a read-only division reference. |

## Verified design authority

- Corporate navy `#0B1220`, royal blue `#2563EB`, metallic gold `#D4AF37`, ivory `#F8FAFC`.
- HB Elektroniker accent `#22D3EE`.
- The official corporate image is maintained as `assets/corporate/hephzibah-behulah-official.jpg` in the design-system repository. The product may use that exact approved source, not an invented replacement.
- The design system mandates `en`, `de`, `yo`, `pcm`, theme switching, accessible navigation/status feedback and one floating Adigun BOT interface.

## Feature inventory at baseline

No product features, package manifest, tests, CI workflow, deployment, authentication, local/cloud persistence, fixture catalog, 3D renderer, DMX engine, AI endpoint or exports existed at audit time.

The supplied reference image defines the editor composition: brand/navigation header, project/layer/tool rail, central work area, context inspector, palette and cue timeline, then a single Lux assistant panel. It is a visual target, not evidence that third-party integrations exist.

## Architecture decision record

1. **Offline-first core.** A static browser application owns project data locally before optional authenticated/cloud services are introduced.
2. **One project document.** Versioned project state, schema validation, migrations and reversible commands are shared by palette, scene, fixtures, DMX and timeline domains.
3. **Layered boundary.** Domain calculations have no DOM dependency; UI, persistence, rendering, AI adapter and hardware connection are separate adapters.
4. **Safe capability boundary.** Lux uses structured `{ type, version, payload }` requests, validates input, previews high-impact changes and uses the same undoable domain commands as direct editing. No browser key or arbitrary generated code is permitted.
5. **Lighting accuracy boundary.** The renderer is artistic previsualization until a calibrated profile and validated photometry workflow are added. Internal virtual DMX works without hardware; Art-Net/sACN require a separate explicitly activated bridge.
6. **Progressive stack.** The initial build is dependency-free static ES modules plus Node's built-in test runner so it can be audited and built without an unverified package installation. Domain boundaries intentionally support a later React/TypeScript/Three.js adapter without changing the native project format. A Three.js/R3F renderer is not claimed until added and tested.

## Current blockers and non-goals

- A local network clone and third-party package download are unavailable in this execution environment. Remote repository reads/writes are performed through the authorized GitHub connection.
- No approved font package, cloud credentials, AI backend credentials, physical DMX gateway, test fixture hardware, GDTF licence corpus or MVR/ASE/Procreate implementation exists in the product repository.
- The browser core will therefore expose these as unavailable until real integrations are added. It will not simulate external activation.

## M0 exit criteria

- [x] Four source repositories inspected.
- [x] Applicable design-system `AGENTS.md`, tokens, identity standard and product template read.
- [x] Product baseline and missing dependencies recorded.
- [x] Dedicated feature branch created.
- [x] Architecture, security, localization and test strategy documented.
- [x] Initial executable validation foundation added.

