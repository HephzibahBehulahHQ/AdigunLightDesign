# Export formats

Cue CSV retains stored sequence order and its cumulative start/end columns. Additional columns report fade-out, computed hold, track name and scheduled track start/end. Sequence times and scheduled times are intentionally separate: cues on different tracks may run simultaneously. Optional legacy timing defaults remain represented. Track names and cue names use CSV escaping; this is an informational report, not a console show-file format.

Design-token JSON uses the application-owned format `adigunlightdesign.design-tokens`, schema version 1. It contains the palette name and a `color` object with ordered `swatch_1`, `swatch_2`, … entries. Each entry records `type: "color"`, normalized six-digit HEX `value`, original `name` and `sourceId`. Index keys preserve duplicate names without collisions. This is not a claim of DTCG, Figma or Adobe compatibility; token import and external-tool validation remain unimplemented.

Implemented local exports are native project JSON, portable palette JSON, CSS custom properties, SVG palette sheets, fixture-patch CSV and cue-list CSV. SVG generation validates HEX colors, escapes user text and supports 1–256 swatches. Browser download and rendered SVG appearance remain unverified. Native project JSON may be re-imported after JSON, schema-version, required-field, MIME and 5 MB size validation. CSV quotes field values for spreadsheet import.

PNG/JPEG palette export adapters render the generated SVG through the browser's image and canvas APIs, then verify the requested encoding MIME type. Adapter success/failure and URL cleanup have mocked automated coverage. Actual browser encoding, downloads, font appearance and output pixels remain unverified.

PDF/ASE/Procreate/glTF/GDTF/MVR and Figma/Adobe/console integration are not implemented and are not displayed as working exports. Re-import validation and external interchange adapters require their own schema and compatibility testing before release.
