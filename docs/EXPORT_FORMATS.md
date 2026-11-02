# Export formats

Canvas SVG exports saved rectangle/text artwork as a standalone 800 × 450 SVG with a transparent background. It preserves object stacking order and strips editor selection decorations and interaction attributes. Text remains editable SVG text and uses the viewer's default font; fonts are not embedded. Structure, escaping and invalid-data rejection have tests. Browser downloads, font matching and external-editor compatibility remain unverified.

Viewport PNG redraws the actual WebGL canvas and requests PNG encoding in the same task. It captures the current camera, visible scene and current lighting preview at the viewport's backing resolution. It excludes HTML overlays and editor panels. The control is disabled outside 3D or when WebGL is unavailable. Mocked tests cover redraw order and encoding failures; actual browser pixels and downloads remain unverified. This is not an offline photorealistic renderer.

Cue CSV retains stored sequence order and its cumulative start/end columns. Additional columns report fade-out, computed hold, track name and scheduled track start/end. Sequence times and scheduled times are intentionally separate: cues on different tracks may run simultaneously. Optional legacy timing defaults remain represented. Track names and cue names use CSV escaping; this is an informational report, not a console show-file format.

Design-token JSON uses the application-owned format `adigunlightdesign.design-tokens`, schema version 1. It contains the palette name and a `color` object with ordered `swatch_1`, `swatch_2`, … entries. Each entry records `type: "color"`, normalized six-digit HEX `value`, original `name` and `sourceId`. Index keys preserve duplicate names without collisions. This is not a claim of DTCG, Figma or Adobe compatibility; token import and external-tool validation remain unimplemented.

Implemented local exports are native project JSON, portable palette JSON, CSS custom properties, SVG palette sheets, fixture-patch CSV and cue-list CSV. SVG generation validates HEX colors, escapes user text and supports 1–256 swatches. Browser download and rendered SVG appearance remain unverified. Native project JSON may be re-imported after JSON, schema-version, required-field, MIME and 5 MB size validation. CSV quotes field values for spreadsheet import.

PNG/JPEG palette export adapters render the generated SVG through the browser's image and canvas APIs, then verify the requested encoding MIME type. Adapter success/failure and URL cleanup have mocked automated coverage. Actual browser encoding, downloads, font appearance and output pixels remain unverified.

PDF/Procreate/glTF/GDTF/MVR and Figma/Adobe/console integration are not implemented and are not displayed as working integrations. Re-import validation and external interchange adapters require their own schema and compatibility testing before release.

## Experimental ASE RGB export

The export drawer offers an experimental ASE v1 binary writer for 1–256 opaque
RGB swatches. It writes a named group, UTF-16BE names, normalized big-endian RGB
floats and process-color records. Names must contain 1–255 well-formed UTF-16
code units without NUL. Invalid values or non-opaque swatches reject the entire
export; opacity is never silently discarded. JSON and SVG retain opacity.

The implementation was written independently using ASE reader behavior in
[GIMP's palette loader](https://github.com/GNOME/gimp/blob/master/app/core/gimppalette-load.c)
as a format reference. No GIMP code was copied. GIMP's
[standards notes](https://developer.gimp.org/core/standards/#palette-file-formats)
also document the absence of a publicly available authoritative ASE specification.
Tests decode the generated binary records independently and check names, group
boundaries, record lengths, RGB values, process type and failure cases.

No ASE re-import, CMYK/Lab/spot-color output, ICC profile, Adobe integration or
external application/version compatibility is established. Browser download and
actual GIMP/Adobe import still require verification; keep the experimental label.
