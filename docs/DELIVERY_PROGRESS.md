# Delivery evidence and remaining gates

Audit date: 3 November 2026. Scope remains the entire supplied master
specification, the latest 1672 × 941 interface reference, floating Bot,
compact account/language menu and canonical domain requirements.

## Progress estimate

The reported 48% is an engineering estimate, not the percentage of acceptance
tests passed. Weights emphasize the requested visual editor and core engines.
Partial credit represents implemented, tested source; it does not close a
milestone whose browser, integration or release gate remains open. Reassess
these estimates when stronger evidence becomes available.

| Milestone | Weight | Estimated earned | Evidence and material gaps |
| --- | ---: | ---: | --- |
| M0 audit/architecture | 5 | 5 | `M0_AUDIT.md`, `ARCHITECTURE.md`, product baseline and test foundation. Initial packaging assumptions were superseded by Vite. |
| M1 shell/design | 15 | 8 | Four dictionaries, tokens, header/navigation, themes, floating Bot and compact menu exist. Exact reference fidelity, mobile nonoverlap, keyboard/focus and translation review are unverified. |
| M2 palette | 15 | 12 | Color/harmony/contrast, image extraction, locks, temperature, opacity, versions and local adapters have tests. Real browser workflows, image encoding and downloads remain unverified. |
| M3 3D editor | 20 | 5 | Actual artistic WebGL geometry, room/material edits, fixture transforms, cameras, picking and palette mapping. Photoreal reference appearance, calibrated lighting, richer materials and hardware performance are not established. |
| M4 fixtures/virtual DMX | 10 | 5 | Validated generic profiles, allocation, groups and virtual channel state. Only three generic profiles; extended licensed catalog, GDTF interchange and physical output are not complete. |
| M5 timeline | 10 | 6 | Track scheduling, keyframes, fades/effects, clock/playback and pointer/keyboard seeking have automated coverage. Browser editing/playback and reference appearance remain unverified. |
| M6 Lux | 10 | 3 | Context/tool boundaries, preview/confirm, receipts/undo, optional HTTP adapter and local live suggestions have tests. Live provider, real authenticated action flow, voice/image workflows and production service operation remain open. |
| M7 exports | 5 | 2 | Native JSON, CSS, SVG/raster, CSV, experimental ASE and raster-backed palette PDF. Actual browser downloads, cue PDF and validated advanced interchange remain open. |
| M8 hardening/release | 10 | 2 | Documentation, automated CI and strict contracts across migrated domain engines exist. Full TypeScript coverage/lint, accessibility, performance, localization/security acceptance, cloud integration and production editor release remain open. |
| Total | 100 | 48 | Estimated remaining work: 52%. |

M9 remains part of the documented advanced roadmap: physical DMX bridge,
extended catalog, collaboration, Figma plugin, community publishing and advanced
photometry. No credit or completion is claimed for those capabilities. They are
not silently substituted with local simulation.

## Evidence boundaries

- Last full local suite: 238 passed, zero failures/skips. Incremental strict
  checking, compile-only domain contract regressions, project check and production
  build passed. The one-point M8 estimate increase reflects the implemented
  connected domain typing and enforced compiler gate, not additional test count.
- CI executes dependency installation, tests, project check and production build.
  It now executes an incremental strict TypeScript gate for migrated `.ts` source, beginning with the playback clock. It does not establish full application typing and does not execute browser acceptance, lint or deployment.
- Draft PR #1 contains the application on `codex/adigunlightdesign-m0-foundation`.
  The inspected main branch remains `943e9df1d1cae22a1d267ef1c01f752409c6680c`;
  branch publication is not a production editor deployment.
- The build reports Auth unconfigured. Shared Supabase schema/role checks do not
  prove browser login, cloud save/reload, real JWT isolation or redirect setup.
- Independent PDF parsing/rendering used supplied synthetic pixels; it does not
  verify browser SVG encoding, Unicode font coverage or a real download.

## Required next acceptance work

1. Obtain permitted rendered evidence at 1672 × 941, 1440 × 900 and mobile widths;
   compare the actual editor against the attached target, including the later
   floating-Bot/menu requirements. Do not bypass a blocked browser action.
2. Resolve substantive 3D fidelity/material/lighting gaps using real scene state;
   a background screenshot cannot stand in for the functional scene editor.
3. Complete strict typing/lint and browser end-to-end gates from the master spec.
4. Verify actual account/cloud and configured Lux flows before claiming them
   operational. Preserve registered-user authorization and project isolation.
5. Finish cue PDF and validate every advertised interchange adapter externally.
6. Complete accessibility, translation, performance and security acceptance.
7. Prepare a reviewable canonical-domain release. Current instructions prohibit
   merge/deployment, force pushes and history rewriting; source publication alone
   cannot close that release gate.

This ledger is not a completion declaration. A milestone closes only when its
full required behavior and corresponding acceptance evidence are established.
