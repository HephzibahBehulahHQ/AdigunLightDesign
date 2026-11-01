# Testing strategy

Every milestone must run `npm test`, `npm run check` and `npm run build`.

- Unit tests: color conversion/harmony/contrast, address allocation, interpolation, migrations, undo and locale switching.
- Integration tests: palette-to-material, fixture-to-scene, patch-to-cue, cue-to-renderer and validated AI action-to-project mutation.
- Browser tests: keyboard editor workflow, responsive editor layouts, four language switches, save/reopen, export and inaccessible-control checks.
- Visual regression: approved desktop reference composition at 1440 × 900 plus narrow-screen coverage.

Results must identify executed commands and actual pass/fail outcomes. A static render, a generated mock image or an unconnected control is not a functional test.

