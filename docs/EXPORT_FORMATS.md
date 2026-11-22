# Export formats

The browser acceptance runner exercises the studio Export menu. It checks
palette JSON and token contents, a shared color in CSS and SVG, PNG dimensions
and signature, JPEG boundary markers, the palette PDF signature, a readable
one-page cue PDF, patch and cue CSV headers and sample rows, the experimental
ASE signature, and edited vector text in the canvas SVG. Visual output quality
and external application compatibility require separate verification.

The native project browser check downloads an edited project, imports that
file, downloads it again and compares the entire parsed versioned document,
including scene, palette, fixture and cue data.

Canvas SVG exports saved rectangle/text artwork as a standalone 800 × 450 SVG with a transparent background. It preserves object stacking order and strips editor selection decorations and interaction attributes. Text remains editable SVG text and uses the viewer's default font; fonts are not embedded. Structure, escaping and invalid-data rejection have tests. Font matching and external-editor compatibility remain unverified.

Viewport PNG redraws the actual WebGL canvas and encodes a 1920 × 1080 image of
the current camera, visible scene and lighting. It excludes HTML overlays and
editor panels. The control is disabled outside 3D or when WebGL is unavailable.
Mocked tests cover redraw order and encoding failures. Chrome acceptance decodes
the actual PNG downloads and checks opaque scene detail, distinct front and top
views, and a visible response to a fixture color and dimmer edit in the kitchen.
The export uses the studio’s artistic previsualization renderer.

Cue CSV retains stored sequence order and its cumulative start/end columns. Additional columns report fade-out, computed hold, track name and scheduled track start/end. Sequence times and scheduled times are intentionally separate: cues on different tracks may run simultaneously. Optional legacy timing defaults remain represented. Track names and cue names use CSV escaping; this is an informational report, not a console show-file format.

Design-token JSON uses the application-owned format `adigunlightdesign.design-tokens`, schema version 1. It contains the palette name and a `color` object with ordered `swatch_1`, `swatch_2`, … entries. Each entry records `type: "color"`, normalized six-digit HEX `value`, original `name` and `sourceId`. Index keys preserve duplicate names without collisions. This is not a claim of DTCG, Figma or Adobe compatibility; token import and external-tool validation remain unimplemented.

Portable palette JSON can be imported through the Palette menu. Import preserves the palette name, harmony, swatch order, IDs, colours, locks and opacity. It applies to the active palette in one undoable edit and retains that palette’s project identity.

Implemented local exports are native project JSON, portable palette JSON, CSS custom properties, SVG palette sheets, fixture-patch CSV and cue-list CSV. SVG generation validates HEX colors, escapes user text and supports 1–256 swatches. Native project JSON may be re-imported after JSON, schema-version, required-field, MIME and 5 MB size validation. Patch and cue CSV quote fields and prefix formula-like text labels with an apostrophe to reduce formula interpretation on opening. Some spreadsheet programs may strip this protection on CSV re-save. Native project JSON retains the exact names. See [OWASP CSV guidance](https://owasp.org/www-community/attacks/CSV_Injection).

PNG/JPEG palette export adapters render the generated SVG through the browser's image and canvas APIs, then verify the requested encoding MIME type. Adapter success/failure and URL cleanup have mocked automated coverage. Chrome decodes the actual starter-palette SVG, PNG and JPEG downloads and checks the center of each swatch against the corresponding source RGB value. SVG and PNG match exactly. JPEG is checked with a five-level per-channel tolerance for lossy encoding. This check covers opaque swatch fills. Font appearance remains open.

Procreate/glTF/GDTF/MVR and Figma/Adobe/console integration are not implemented and are not displayed as working integrations. Re-import validation and external interchange adapters require their own schema and compatibility testing before release.

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

Independent verification used [Swatch 0.4.0](https://github.com/nsfmc/swatch/tree/8654edf4f1aeef37d42211ff3fe6a3e9e4325859) to open ASE files generated by the production writer. It decoded the starter palette and a palette with Yoruba accents and emoji. Both retained the group name, swatch order and names, process-color flags, and every RGB channel value at 8-bit precision.

GIMP 3.2.6 on Windows also opened both exports through Palettes → Import
Palette → Palette file. The GIMP palettes saved by the application preserved
all seven swatches in order, with exact 8-bit RGB values and swatch names,
including Yoruba accents and emoji. GIMP used each input filename as the
default palette title.

The Palette menu opens ASE v1 libraries with up to 256 RGB process or global
swatches. If a library has multiple groups, the picker lets the user choose
which one replaces the active palette. Import uses the group name where
present and the filename stem for ungrouped swatches. It preserves swatch
order and names, with RGB values rounded to the nearest 8-bit channel value.
An ungrouped file generated by Swatch 0.4.0 verifies this layout. ASE does not carry studio
IDs, locks, or harmony. Imported swatches get new IDs and are unlocked, and
the active harmony stays in place. One Undo restores the previous palette.
The import dialog explains that global swatches become independent RGB
colors and their original artwork links are unavailable. The importer
rejects unsupported color models, spot swatches, nested groups and malformed
records. Chrome listed all 24 groups in the IBM Design Language v2.0
library. The selected Magenta group matched all ten ordered swatch names and
RGB values independently decoded by Swatch 0.4.0. Adobe application import
and ICC profiles remain unverified. [IBM Design Language Color Library](https://github.com/IBM-Design/colors/tree/v2.0)

## PDF palette sheets

PDF palette export uses pinned pdf-lib 1.17.1 and the existing browser PNG palette renderer, with ten swatches per A4 page and page/range numbering. It preserves RGB appearance and browser-rendered Unicode/opacity as raster artwork. Names longer than 12 grapheme clusters and palette headings longer than 28 grapheme clusters are shortened in the sheet; native JSON retains full names. PDF text inside artwork is not searchable or editable, fonts are not embedded, and this is not an ICC/CMYK print proof. Adapter tests cover page count, metadata, source preservation and encoding failure. Implementation reference: [pdf-lib PDFDocument API](https://pdf-lib.js.org/docs/api/classes/pdfdocument).

The Chrome acceptance run verifies the downloaded starter sheet’s palette title
and page count and saves the PDF under `outputs/` for inspection. An independent
pypdf check confirmed the title, one page and the printed range of 1–5 out of
5 swatches. A 120 DPI Poppler render showed legible headings, labels, HEX values
and footer. All five sampled swatch centers matched the source RGB exactly.

PDF label shortening uses Unicode grapheme segmentation, preserving combining Yoruba accents and joined emoji rather than cutting inside a visible character. This path requires browser support for Intl.Segmenter. Automated tests cover decomposed accents and joined emoji; visual font coverage remains browser-dependent.
