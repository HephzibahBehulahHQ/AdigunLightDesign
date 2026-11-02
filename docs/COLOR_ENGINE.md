# Color engine

The inspector supports direct HSL and OKLCH editing through undoable palette transactions. OKLCH values outside sRGB reduce chroma using a 24-step binary search while keeping lightness and hue; application reports the resulting chroma. Stored swatches remain rounded six-digit sRGB HEX colors. This is an application-defined mapping, not a claim of conformance to a particular CSS gamut-mapping algorithm or Display-P3 support. Browser control behavior remains unverified.

Image extraction accepts local PNG, JPEG and WebP uploads up to 10 MB and 20 megapixels. Browser decoding downsamples to at most 256 pixels on the longest side. A deterministic 5-bit RGB histogram ranks alpha-weighted color populations, ignores fully transparent pixels and returns up to five dominant bins. It is a quantized approximation, not perceptual clustering or a color-managed photographic workflow. Extracted colors are appended through project transactions, preserving existing/locked swatches and supporting undo. Images are processed locally and are not stored in the project or uploaded. Browser decoding and end-to-end interaction remain unverified.

The deterministic engine accepts HEX values; converts RGB, HSL, HSV, XYZ, CIELAB/LCH and OKLab/OKLCH; reports sRGB-gamut bounds; generates complementary, split-complementary, analogous, triadic, tetradic, square and monochromatic harmonies; and calculates sRGB relative luminance and WCAG contrast ratios.

Locked swatches are preserved during reroll. CSS export is native and local. Display-P3 conversion, color-vision-deficiency simulation and AI suggestions remain future additions with separate validation.

Contrast results cover the selected swatch against the editable background, with separate normal/large-text AA/AAA outcomes. Suggestions search HSL lightness in 0.001 increments while retaining hue and saturation, then measure the resulting rounded sRGB HEX value. Applying a suggestion is explicit and undoable. A missing solution is reported by the engine rather than claimed as a pass. These pairwise results do not certify an entire palette or application.
