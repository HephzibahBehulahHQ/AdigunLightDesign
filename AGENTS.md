# AdigunLightDesign agent instructions

Read `docs/M0_AUDIT.md` and the architecture documentation before changing product code. The product repository is the exclusive destination for application code, tests, deployment workflows and product documentation.

## Brand and UI

- Preserve the hierarchy: Hephzibah Behulah → HB Elektroniker → AdigunLightDesign.
- Use the shared design-system tokens and exactly one verified corporate logo in the header.
- Do not fabricate a logo, fixture data, backend, hardware connection, translation, integration or completed test result.
- The supplied 1440 × 900 editor reference is the desktop visual acceptance target. A feature is not accepted merely because its control appears in the UI; it needs an implemented action and automated coverage appropriate to its risk.

## Engineering

- Keep a single versioned project document and pass all human and AI mutations through validated operations.
- Keep virtual DMX, rendered lighting and external hardware output separate. External output must be opt-in and must show its connection state.
- Do not place private keys in browser code or accept arbitrary executable AI output.
- Keep complete locale dictionaries for `en`, `de`, `yo` and `pcm`; persist language changes without changing design data.
- Work in milestones. Update tests and relevant documentation before reporting a milestone as complete.

