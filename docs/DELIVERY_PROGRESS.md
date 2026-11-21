# Delivery evidence and remaining gates

Scope remains the supplied master specification, the owner-approved editor
reference, the floating Bot and compact menu, and the canonical site.

## Release evidence as of 21 November 2026

The [public editor](https://adigunlightdesign.hephzibahbehulah.com/) was verified
through commit [`b0c7635`](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/commit/b0c76353cdcc9bc103062699e2182edf7f7b6d66).
[CI](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44949537404)
and the [Pages release with asset checksums](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44949732266)
passed. During the landing release (#225), Chrome verified the live 3D preview at desktop
and phone widths, both recorded studio demos, and the editable sample carrying
its selected look and dimmer setting into the studio.

| Merged work | Commit and release | Verified evidence |
| --- | --- | --- |
| Header target sizes (#212) | `bbfdf02` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44922659880) | 44 px targets, tooltip labels, and keyboard order at desktop and phone widths. |
| Restore export actions (#213) | `7aa7a7e` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44923210919) | Real downloads for palette JSON, CSS, SVG, PNG, JPEG, and PDF. |
| Image-to-palette (#214–215) | `d88d543` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44923646851), `28814fe` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44924117111) | PNG, JPEG, and WebP file chooser; expected extracted swatches; undo/redo. |
| Remaining export actions (#216) | `b48fd3f` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44924580792) | Design-token JSON, experimental ASE, CSVs, cue-sheet PDF, and vector canvas SVG. |
| Docked assistant (#217–218) | `09cce48` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44925076044), `4de1028` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44925525838) | Expanded settings, visible consent, and touch access. |
| Responsive studio (#219–221) | `8484186` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44926066662), `870364e` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44926625272), `d6f1655` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44927093384) | Three phone, six tablet, and seven desktop widths. The phone fixture edit keeps Apply in view. |
| Guest bundle and offline startup (#222–224) | `e02d7ef` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44927509208), `759f87c` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44928117057), `1fbab89` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44928522482) | Guest JavaScript dropped from 173 to 118 kB gzipped. Chrome verified reopening and PDF export offline, and the live site reopened after one online visit. |
| Live landing (#225) | `cec9ffe` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44929898285) | Editable 3D sample, fixture dimming, genuine studio videos, and Export labels checked in all four locales. |
| Timeline editing (#226) | `c9c8372` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44930577136) | Chrome checks cue timing, keyframe persistence, and pointer and keyboard seeking. |
| Stop playback (#227) | `e3ca9c7` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44931806517) | Chrome verifies restoration of saved WebGL lighting after Stop. |
| Paused final frame (#228) | `38acdf2` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44932549816) | The paused End seek holds the final frame with looping enabled. The monitor reflects the active room. |
| Project dialog focus (#229) | `b54f1f3` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44933112177) | Chrome verifies keyboard focus returns to the originating menu after dialog close. |
| Accessibility checks (#230) | `8155cda` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44934455168) | Chrome axe scans cover four landing and studio configurations across desktop and mobile. |
| Studio demo alternatives (#231) | `a52a448` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44935058188) | The real studio recordings include captions and text descriptions. |
| Fixture auto-patching (#232) | `47bd87a` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44935748863) | New fixtures use the first virtual universe with enough free contiguous addresses. |
| Room starter patching (#233) | `0064679` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44936339247) | Room starter fixtures follow the same multi-universe patching rules. |
| Portable virtual rigs (#234) | `5e7be9f` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44937265166) | Browser import preserves names, transforms, profiles and levels. Imported rigs get fresh IDs and conflict-free patches, and support a single Undo. |
| Assistant service state (#235) | `dcf0214` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44937843684) | Browser configuration and disconnection update the status and retain expanded settings. A live provider is a separate gate. |
| Independent ASE reader (#236) | `1016779` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44938418180) | Swatch decoded two RGB exports with exact ordered values and Unicode names. |
| Cue PDF readability (#237) | `86b0153` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44938942369) | A real Chrome download rendered with full starter labels and visible fade-in, hold and fade-out times. |
| Virtual effects (#238) | `68f6916` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44939586409) | Chrome verifies Pulse, Chase and Pan/Tilt on relevant virtual channels, restored saved levels, and retained effect settings. |
| Arrangement seek (#239) | `e5ad1ba` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44940277843) | Chrome verifies matched timeline and fixture updates at seeks and a retained paused position across a language change. |
| Palette localization (#241) | `bf03792` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44941582338) | Chrome exercises the localized harmony names and live summary in all four supported locales. |
| Project palette harmony (#242) | `22c7844` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44942090103) | Chrome checks harmony in palette JSON, saved projects and fresh versus reopened projects. |
| Image import isolation (#243) | `a6ef6f7` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44942568878) | Chrome delays a real image decode past reopening and verifies the saved palette stays intact. |
| JSON import isolation (#244) | `b8ece31` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44943040678) | Native project and rig reads belong to the workspace that started them. Chrome exercises a delayed rig read. |
| Assistant workspace state (#245) | `89de674` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44943501985) | Chrome verifies reopening clears old proposals. Unit tests cover delayed replies with retained service settings. |
| Assistant edit save state (#246) | `14197ef` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44943992240) | Confirmed assistant edits use the same unsaved state as manual edits. Unit tests cover explicit confirmation and Undo. |
| High-DPI 3D preview (#247) | `94ae8ce` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44944464389) | Chrome measures 1×, 1.5× and 2× backing resolution at 2× device scale. Balanced survives viewport resize. |
| Paused preview work (#248) | `fefdb5d` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44944974762) | A local Chrome probe measured 11 geometry uploads before the change and zero after it during one second of paused playback. |
| Assistant auto-patch (#249) | `2b68fa8` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44945457412) | Focused tests verify Universe 2, address 5 when earlier space is unavailable, with explicit confirmation. |
| DMX range search (#250) | `e3b13c2` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44945874576) | Regression covers a fixture using the old sentinel ID. An independent scan agreed across 500 generated maps. |
| Fixture duplication (#251) | `a7b0f45` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44946445450) | A copy gets an available universe when its source is full. Chrome verifies an edited rotation and dimmer survive rig transfer. |
| Fixture inspector localization (#252) | `15e4456` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44946953488) | Chrome checks section and accessible field labels across all four locales. |
| Camera tour controls (#253) | `df7a684` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44947478511) | Chrome checks reduced-motion startup, manual camera interruption, and Escape. |
| WebGL recovery (#254) | `e267147` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44948112792) | Chrome forces context loss and verifies that the restored preview matches the prior frame. |
| Palette contrast (#255) | `d023c1a` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44948776653) | Chrome checks a just-below-AA ratio, a correction that meets AA, and a translucent swatch against its chosen background. |
| Palette version restore (#256) | `a349b8b` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44949235158) | Chrome restores color, opacity, and harmony after a language redraw, then verifies one-step Undo. |
| Portable palette import (#257) | `b0c7635` · [Pages](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/44949732266) | Chrome imports an actual downloaded palette and undoes the complete import in one step. |

## Remaining acceptance gates

- **M1 and M3:** Exact editor and scene comparison needs the November 14
  reference identified in `VISUAL_ALIGNMENT.md`. The checked-in image has a
  different checksum. Browser layout results and actual WebGL rendering are
  recorded separately. Assistive technology and language review remain open.
- **M2 and M5:** Browser acceptance covers palette extraction, versions,
  contrast thresholds and suggested corrections, portable JSON round-trip,
  local save/reopen, timeline playback, and cue capture across scenes. The
  browser suite also checks cue timing, track scheduling, keyframe persistence,
  pointer and keyboard seeking, virtual effects, and representative delay,
  fade-in, hold and fade-out values. Further rendered fade review remains open.
- **M4, M7, and M9:** Virtual patching, fixture selection, and downloads have
  browser evidence, including a real cue PDF download checked for title and
  page count and a rendered review of the starter sheet.
  The ASE RGB writer has independent Swatch parser evidence. GIMP and Adobe
  application import, advanced interchange, licensed
  catalog coverage, and physical fixture transport remain unverified.
- **M6 and M8:** Production shows Guest mode. Signed-in cloud save/reopen,
  account isolation, and live Lux actions need configured services and real
  test identities. The Pages workflow reads the Supabase publishable key from
  `ALD_SUPABASE_PUBLISHABLE_KEY`. Assistive technology, production security
  acceptance, and frame rates on representative hardware remain open. Chrome
  measurements cover device scale, unchanged frames and context recovery.

## 3D playback performance sample

On 21 November 2026, headless Chrome 158 on Windows reported an Intel Arc
140T renderer using ANGLE Direct3D 11. In the starter studio at 1440 × 900
CSS pixels and 2× device scale, the test timed animation callbacks for 3.2
seconds after a 0.7-second warm-up and counted actual WebGL buffer uploads
during Pulse. The baseline was the verified public release at commit
`ce5cad4`. The second run used the optimized build on the same machine.

| Preview | Baseline Pulse p95 | Optimized Pulse p95 | Baseline / optimized browser frames per second |
| --- | ---: | ---: | ---: |
| Performance | 48.8 ms | 20.1 ms | 56.4 / 70.7 |
| Balanced | 57.7 ms | 30.0 ms | 52.7 / 72.7 |
| Quality | 113.4 ms | 39.6 ms | 23.4 / 59.6 |

Each Pulse run uploaded 32 lighting frames. Browser frame counts describe
animation callback cadence, which includes time between lighting updates.
A separate CPU probe generated ten dimmer frames per mode. Matching SHA-256
hashes verified identical geometry and color buffers in the sampled frames.
This is one GPU and one starter rig. Large rigs, other GPUs, and mobile
hardware still need testing.

## Historical progress estimate, 15 November 2026

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

On 15 November 2026, [PR #205](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/205)
added 20 editable paint-and-light looks for new room scenes. Each room now starts
with patched RGB wash and LED strip fixtures, and a floating canvas switch cycles
the scene looks while preserving manual editing and undo/redo. Local validation
passed 301 tests, project checks, lint, strict TypeScript checking, production
build and browser studio acceptance at seven viewports; the browser reported no
document overflow, panel overlap or runtime errors. Main validation run
[43737126004](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43737126004)
and Pages deployment run
[43737126049](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43737126049)
passed for merge commit `bbec863a9579a7bfa8450c476cab8e10604194fe`. The canonical
domain returned HTTP 200 and served the release JavaScript bundle containing
the room-look implementation.

On 15 November 2026, [PR #194](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/pull/194)
made newly added fixtures respect the active room dimensions, placed LED strips
on the rear wall, and retained independent fixture color/dimmer state by scene.
The fixture-list popover now closes on Escape and returns focus to its trigger.
During the rebase, the existing fixture inspector position/rotation and HTML
escaping regression tests were preserved alongside the new room-placement tests.
All 296 tests, lint, typecheck, project contract checks and production build
passed locally. Browser studio acceptance passed at seven viewports with no
document overflow, overlap or runtime errors. The rebased PR checks passed;
merge commit `3e80fd1d0f2d5cbd10ce6001d9eb92068f93c892`, main validation run
[43733619115](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43733619115)
and Pages release run
[43733619021](https://github.com/HephzibahBehulahHQ/AdigunLightDesign/actions/runs/43733619021)
passed. The production domain returned HTTP 200 and served the locally built
JavaScript and CSS bundle hashes.

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
5. Review longer cue PDF layouts and validate interchange in the target applications.
6. Complete accessibility, translation, performance and security acceptance.
7. Prepare a reviewable canonical-domain release. Push each verified increment
   through a focused PR, merge and deploy it promptly, and record its checks,
   commit and release run. Do not accumulate unrelated work into one large PR.
   Force pushes and history rewriting remain prohibited.

This ledger is not a completion declaration. A milestone closes only when its
full required behavior and corresponding acceptance evidence are established.



