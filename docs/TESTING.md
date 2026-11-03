# Testing strategy

Every milestone must run `npm test`, `npm run check` and `npm run build`.

Run `npm run typecheck` as well. The incremental strict TypeScript gate currently
checks `src/**/*.ts`, covering the playback clock, timeline layout, preview quality budgets, room dimensions, stage settings browser-storage adapters viewport picking shared camera/projection math and project history. Existing JavaScript
modules are not silently covered by this command; full application typing and
lint remain open release gates. Their JavaScript entry points re-export
the typed implementation so existing consumers and tests retain their imports.
Node 24 executes its erasable syntax; Vite bundles it for the browser. CI runs
this typecheck before the existing test/check/build jobs.

- Unit tests: color conversion/harmony/contrast, address allocation, interpolation, migrations, undo and locale switching.
- Integration tests: palette-to-material, fixture-to-scene, patch-to-cue, cue-to-renderer and validated AI action-to-project mutation.
- Browser tests: keyboard editor workflow, responsive editor layouts, four language switches, save/reopen, export and inaccessible-control checks.
- Visual regression: approved desktop reference composition at 1672 × 941, additional 1440 × 900 coverage and narrow-screen coverage. Preserve the later floating-Bot and compact-menu requirements.

Results must identify executed commands and actual pass/fail outcomes. A static render, a generated mock image or an unconnected control is not a functional test.

