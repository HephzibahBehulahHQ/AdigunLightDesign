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
| M3 3D editor | 20 | 5 | Actual artistic WebGL geometry, room/material edits, fixture transforms, cameras, picking and palette mapping; face-aware spill, room-fit furniture and ceiling rig, procedural prop contact shading, segmented studio foliage, sofa cushion piping, crowned seat cushions, padded backrest panels, a padded studio accent chair, gradient-sky mountain wall art, procedural floor grain and a woven rug with border and nested diamond motifs now improve the preview. Photoreal reference appearance, calibrated lighting, richer materials and hardware performance are not established. |
| M4 fixtures/virtual DMX | 10 | 5 | Validated generic profiles, allocation, groups and virtual channel state. Only three generic profiles; extended licensed catalog, GDTF interchange and physical output are not complete. |
| M5 timeline | 10 | 6 | Track scheduling, keyframes, fades/effects, clock/playback and pointer/keyboard seeking have automated coverage. Browser editing/playback and reference appearance remain unverified. |
| M6 Lux | 10 | 3 | Context/tool boundaries, preview/confirm, receipts/undo, optional HTTP adapter and local live suggestions have tests. Live provider, real authenticated action flow, voice/image workflows and production service operation remain open. |
| M7 exports | 5 | 2 | Native JSON, CSS, SVG/raster, CSV, experimental ASE and raster-backed palette and cue PDFs. Browser downloads and advanced interchange validation remain open. |
| M8 hardening/release | 10 | 2 | Documentation, automated CI and strict contracts across migrated domain engines exist. Full TypeScript coverage/lint, accessibility, performance, localization/security acceptance, cloud integration and production editor release remain open. |
| Total | 100 | 48 | Estimated remaining work: 52%. |

## Recent verified increments

The latest viewport increment was merged on 12 November 2026:

- [PR #83](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/83)
  constrained the desktop studio to one viewport and reserved room for the open
  Lux window. The 273-test suite, lint, typecheck, project check and build passed
  in CI. Main-branch validation run
  [43312650394](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43312650394)
  and Pages release run
  [43312650389](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43312650389)
  passed for merge commit `212f8866fa75df219ba178b26be2a7f546ac33a8`, including
  custom-domain checksum verification. Deployed Playwright checks at 1280 × 720,
  1366 × 768, 1440 × 900 and 1920 × 1080 found no document overflow or workspace/Lux
  collision; 2D and 3D view switching worked.

On 12 November 2026, two M8 typing increments were merged and deployed:

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
- [PR #50](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/50)
  added a warm-to-cool gradient sky to the mountain artwork. CI passed, and
  [Pages release run 43269375051](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43269375051)
  passed, including custom-domain verification, for commit `7fdd2a4`.
- [PR #53](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/53)
  fit built-in furniture and the ceiling rig to smaller editable rooms while
  preserving room-sized walls, slats, artwork, and user stage settings. CI
  passed, and [Pages release run 43272317916](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43272317916)
  passed, including custom-domain verification, for commit `925087a`.
- [PR #55](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/55)
  corrected scene documentation to match the existing artistic fixture, beam,
  spill, room-fit rig and furniture behavior while preserving photometry and
  browser-acceptance limits. CI and Pages release run
  [43274077359](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43274077359)
  passed, including custom-domain verification, for commit `aebaf89`; the live
  custom domain returned HTTP 200.
- [PR #56](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/56)
  added editable fixture X/Y/Z coordinates in meters and rotation in degrees to
  the inspector, connecting them to the existing validated undo flow. All 262
  tests, lint, typecheck, project check and build passed. Pages release run
  [43275423233](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43275423233)
  passed including custom-domain verification, for commit `c492512`.
- [PR #58](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/58)
  added Shift-drag fixture placement at an angled camera view with live preview,
  one undoable update on release, and restore-on-cancel. All 264 tests, lint,
  typecheck, project check and build passed. Pages release run
  [43279482575](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43279482575)
  passed including custom-domain verification, for commit `0836944`.
- [PR #60](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/60)
  made fixture picking reject centers hidden behind opaque room, furniture or
  stage geometry while retaining approximate center hit testing. All 267 tests,
  lint, typecheck, project check and build passed. Pages release run
  [43283009596](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43283009596)
  passed including custom-domain verification, for commit `ec66430`.
- [PR #62](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/62)
  added direct ray intersection against fixture housing triangles with opaque
  scene occlusion and projected-center fallback. All 269 tests, lint, typecheck,
  project check and build passed in CI. Pages run
  [43285107761](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43285107761)
  passed deployment and custom-domain verification for commit `3b4154c`.
- [PR #64](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/64)
  wrapped workspace toolbar controls between 671 and 940 px to avoid compressed
  labels. All 269 tests, lint, typecheck, project check and build passed. Pages
  run [43287446392](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43287446392)
  passed deployment and custom-domain verification for commit `281637c`.
- [PR #67](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/67)
  made fixture-housing picking and opaque-scene occlusion share the same
  triangle-ray intersection routine while preserving the housing self-hit
  margin. All 269 tests and project gates passed. Pages run
  [43289995506](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43289995506)
  passed deployment and custom-domain verification for commit `5e44a05`.
- [PR #69](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/69)
  aligned the assistant shell, offline status, placeholders and accessible
  labels with the Lux — AI Co-Pilot reference in all four locales. All 270
  tests and project gates passed. Pages run
  [43291719882](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43291719882)
  passed deployment and custom-domain verification for commit `8ddff23`.
- [PR #71](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/71)
  caches fixture housing meshes for repeated picking until fixture data changes.
  All 270 tests, lint, typecheck, project check and build passed. Pages run
  [43293979917](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43293979917)
  passed deployment and custom-domain verification; the live custom domain
  returned HTTP 200 for commit `9d3df03`.
- [PR #73](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/73)
  removed the internal project-status cards from the design workspace and kept
  the default desktop Lux panel above the status footer. The full CI validation
  passed; focused Lux geometry tests passed 8/8 locally. Pages run
  [43299206613](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43299206613)
  passed deployment and custom-domain verification; the live domain returned
  HTTP 200 for commit `086411c`.
- [PR #75](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/75)
  kept the editor Tools section available on narrow screens. All 271 tests,
  lint, typecheck, project check and build passed locally and in full CI. Pages
  run [43301508303](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43301508303)
  passed deployment and custom-domain verification for commit `bc83267`. Live
  browser checks found no horizontal page overflow at 1672 x 941, 1440 x 900
  or 390 x 844; mobile fixture selection opened Libraries & Assets.
- [PR #78](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/78)
  replaced the unused desktop assistant column with a three-track, full-height
  workspace: tools, scene plus palette/timeline dock, and inspector. CI passed;
  Pages run [43304456636](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43304456636)
  passed deployment and custom-domain verification for commit `c24b31b`. Live
  browser checks at 1880 x 690 and 1672 x 941 confirmed no page overflow or
  unused grid track; Lux reserves 352px only while open.
- [PR #77](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/77)
  made beam-cone detail follow preview quality (12/24/40 segments). All 271
  tests and CI passed; focused geometry tests passed 25/25. Pages run
  [43305031932](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43305031932)
  passed deployment and custom-domain verification for commit `dc58182`.

These increments improve strict typing, the artistic scene preview and editor
workspace. They do not complete M3 or M8, and do not recalculate the overall
engineering estimate above.

M9 remains part of the documented advanced roadmap: physical DMX bridge,
extended catalog, collaboration, Figma plugin, community publishing and advanced
photometry. No credit or completion is claimed for those capabilities. They are
not silently substituted with local simulation.

## Evidence boundaries

- Latest recorded full suite: PR #83 CI passed on 12 November 2026 with 273
  tests and no failures or skips. The deployed studio was checked at 1280 × 720,
  1366 × 768, 1440 × 900 and 1920 × 1080 for document overflow, panel collision
  and 2D/3D tab operation. Earlier mobile tools and fixture-selection checks
  cover 390 × 844; other mobile widths remain unverified. For the earlier Help-link increment,
  focused top-menu suite passed 3/3, and local lint,
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

1. Desktop views were checked at 1280 × 720, 1366 × 768, 1440 × 900 and
   1920 × 1080; the document matched each viewport and the workspace did not
   collide with Lux. Prior 390 × 844 mobile tool checks still apply. Exact scene,
   Lux/menu reference fidelity and additional mobile widths remain unverified.
   Do not bypass a blocked browser action.
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


