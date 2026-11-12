# Delivery evidence and remaining gates

Audit date: 12 November 2026. Scope remains the entire supplied master
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
| M3 3D editor | 20 | 5 | Actual artistic WebGL geometry, room/material edits, fixture transforms, cameras, picking and palette mapping; face-aware spill, procedural prop contact shading, segmented studio foliage, sofa cushion piping, crowned seat cushions, padded backrest panels, a padded studio accent chair, snow-capped mountain wall art, procedural floor grain and a woven rug with border and nested diamond motifs now improve the preview. Photoreal reference appearance, calibrated lighting, richer materials and hardware performance are not established. |
| M4 fixtures/virtual DMX | 10 | 5 | Validated generic profiles, allocation, groups and virtual channel state. Only three generic profiles; extended licensed catalog, GDTF interchange and physical output are not complete. |
| M5 timeline | 10 | 6 | Track scheduling, keyframes, fades/effects, clock/playback and pointer/keyboard seeking have automated coverage. Browser editing/playback and reference appearance remain unverified. |
| M6 Lux | 10 | 3 | Context/tool boundaries, preview/confirm, receipts/undo, optional HTTP adapter and local live suggestions have tests. Live provider, real authenticated action flow, voice/image workflows and production service operation remain open. |
| M7 exports | 5 | 2 | Native JSON, CSS, SVG/raster, CSV, experimental ASE and raster-backed palette and cue PDFs. Browser downloads and advanced interchange validation remain open. |
| M8 hardening/release | 10 | 2 | Documentation, automated CI and strict contracts across migrated domain engines exist. Full TypeScript coverage/lint, accessibility, performance, localization/security acceptance, cloud integration and production editor release remain open. |
| Total | 100 | 48 | Estimated remaining work: 52%. |

## Recent verified increments

On 12 November 2026, two M8 typing increments were merged and deployed:

- [PR #25](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/25)
  moved fixture duplication/deletion operations to TypeScript. CI passed, and
  [Pages release run 43234332719](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43234332719)
  passed for commit `440c955`.
- [PR #26](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/26)
  moved project creation and validation to TypeScript while retaining the `.js`
  import path. CI passed the full suite and build, and
  [Pages release run 43236017998](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43236017998)
  passed for commit `622248c`.
- [PR #28](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/28)
  added face-aware artistic fixture spill. CI passed, and
  [Pages release run 43240228988](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43240228988)
  passed for commit `353c43a`.
- [PR #29](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/29)
  added soft prop contact shading. CI passed, and
  [Pages release run 43243633307](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43243633307)
  passed for commit `923df35`.
- [PR #31](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/31)
  refined studio plant leaves with segmented surfaces and visible midribs. CI
  passed, and
  [Pages release run 43245465416](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43245465416)
  passed for commit `659f792`.
- [PR #33](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/33)
  added procedural piping to the three studio sofa seat cushions. CI passed,
  and [Pages release run 43249352506](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43249352506)
  passed for commit `153a95f`.
- [PR #36](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/36)
  replaced flat sofa seat blocks with softly crowned cushion meshes. CI passed,
  and [Pages release run 43251604759](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43251604759)
  passed for commit `a8f87f6`.
- [PR #38](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/38)
  replaced the flat sofa back slab with three padded panels. CI passed, and
  [Pages release run 43257405265](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43257405265)
  passed for commit `1d8de45`.
- [PR #40](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/40)
  added color-aware procedural grain to the wood floor. CI passed, and
  [Pages release run 43259014336](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43259014336)
  passed for commit `e318890`.
- [PR #42](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/42)
  added paired color bands to the studio rug. CI passed, and
  [Pages release run 43261092237](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43261092237)
  passed for commit `5236898`.
- [PR #44](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/44)
  added repeated nested diamond motifs across the studio rug. CI passed, and
  [Pages release run 43263177355](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43263177355)
  passed, including custom-domain verification, for commit `ec3e7a5`.
- [PR #46](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/46)
  replaced the left chair's flat block silhouette with a padded seat/back and
  upholstered arms. CI passed, and
  [Pages release run 43265251494](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43265251494)
  passed, including custom-domain verification, for commit `464e714`.
- [PR #48](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/48)
  added snow caps to the studio's distant mountain artwork. CI passed, and
  [Pages release run 43267678361](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43267678361)
  passed, including custom-domain verification, for commit `32b5e91`.

These increments improve strict typing and the artistic scene preview. They do
not complete M3 or M8, and do not recalculate the overall engineering estimate
above.

M9 remains part of the documented advanced roadmap: physical DMX bridge,
extended catalog, collaboration, Figma plugin, community publishing and advanced
photometry. No credit or completion is claimed for those capabilities. They are
not silently substituted with local simulation.

## Evidence boundaries

- Latest recorded full local suite: 238 passed, zero failures/skips. For the
  Help-link increment, the focused top-menu suite passed 3/3, and local lint,
  typecheck, project check and production build passed. PR #16 also passed the
  full GitHub Actions validation workflow.
- Current CI (`.github/workflows/ci.yml`) runs dependency installation, lint,
  strict TypeScript checking for migrated `.ts` source and type contracts, tests,
  project check and production build. It does not establish browser acceptance
  or full application typing.
- PR #16 (`f6e7d45`) corrected the Help link to the current `main` guide and was
  merged to `main`. GitHub Pages release run `43223150644` passed build and
  deploy, including the custom-domain asset checksum verification. This
  confirms the deployed assets match the release; it does not close the open
  editor/browser acceptance gates below.
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
5. Verify cue PDF browser downloads and validate advertised interchange adapters externally.
6. Complete accessibility, translation, performance and security acceptance.
7. Prepare a reviewable canonical-domain release. Push each verified increment
   through a focused PR, merge and deploy it promptly, and record its checks,
   commit and release run. Do not accumulate unrelated work into one large PR.
   Force pushes and history rewriting remain prohibited.

This ledger is not a completion declaration. A milestone closes only when its
full required behavior and corresponding acceptance evidence are established.

