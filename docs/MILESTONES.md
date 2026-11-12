# Milestone acceptance

This sequence matches `docs/ARCHITECTURE.md` and the weighted evidence ledger in
`docs/DELIVERY_PROGRESS.md`. A green build or hosted deployment is release
evidence, not proof of browser, integration, or visual acceptance.

| Milestone | Evidence required | State |
| --- | --- | --- |
| M0 Repository audit and foundations | Corporate, division, design-system, and product audit; constraints recorded in `docs/M0_AUDIT.md`; executable baseline. | Verified |
| M1 Shell and visual identity | Render at 1672 × 941 and 1440 × 900 against the reference; verify mobile layout, navigation, compact account/language menu, keyboard/focus behavior, and floating Lux placement. | Partial |
| M2 Palette engine | Verify color conversions, harmony, contrast, editing, image extraction, local persistence, and project round-trips in a browser; validate advertised downloads. | Partial |
| M3 3D scene editor | Verify interactive WebGL rendering, scene geometry, room/material edits, fixture transforms, camera/picking, and palette mapping; compare the rendered editor with the reference. Preserve the artistic, non-photometric accuracy boundary. | Partial |
| M4 Fixtures and virtual DMX | Verify profile validation, fixture import, patch conflicts, channel state, groups, and output-disabled behavior. Validate the licensed catalog and any hardware transport separately before advertising them. | Partial |
| M5 Cue timeline and playback | Verify track editing, keyframes, fades, effects, seeking, playback, and fixture state in a browser. | Partial |
| M6 Lux assistant | Verify provider configuration, authentication and project isolation, proposal preview, user approval, undo/receipts, and live service behavior. Do not claim voice/image or live-provider support without evidence. | Partial |
| M7 Exports and interchange | Verify native project round-trips and browser downloads for supported formats. Independently validate each advertised external interchange adapter. | Partial |
| M8 Hardening and release | Complete application-wide typing/lint, accessibility, localization, security, performance, cloud-integration, and production-release acceptance. Verify the merged commit and deployed assets. | Partial |
| M9 Advanced roadmap | Implement and validate physical DMX transport, extended fixture catalog, collaboration, Figma plugin, community publishing, and advanced photometry before claiming availability. | Roadmap |

For each increment, record the focused change, checks, merged commit, and live
release run in `docs/DELIVERY_PROGRESS.md`. Close a milestone only when all of
its evidence requirements are met; partial implementation and release checks
do not close browser or integration gates.
