# Export formats

Implemented local exports are native project JSON, portable palette JSON, CSS custom properties, SVG palette sheets, fixture-patch CSV and cue-list CSV. SVG generation validates HEX colors, escapes user text and supports 1–256 swatches. Browser download and rendered SVG appearance remain unverified. Native project JSON may be re-imported after JSON, schema-version, required-field, MIME and 5 MB size validation. CSV quotes field values for spreadsheet import.

PNG/JPEG/PDF/ASE/Procreate/glTF/GDTF/MVR and Figma/Adobe/console integration are not implemented and are not displayed as working exports. Re-import validation and external interchange adapters require their own schema and compatibility testing before release.
