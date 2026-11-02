# Color engine

Image extraction accepts local PNG, JPEG and WebP uploads up to 10 MB and 20 megapixels. Browser decoding downsamples to at most 256 pixels on the longest side. A deterministic 5-bit RGB histogram ranks alpha-weighted color populations, ignores fully transparent pixels and returns up to five dominant bins. It is a quantized approximation, not perceptual clustering or a color-managed photographic workflow. Extracted colors are appended through project transactions, preserving existing/locked swatches and supporting undo. Images are processed locally and are not stored in the project or uploaded. Browser decoding and end-to-end interaction remain unverified.

The deterministic engine accepts HEX values; converts RGB, HSL, HSV, XYZ, CIELAB/LCH and OKLab/OKLCH; reports sRGB-gamut bounds; generates complementary, split-complementary, analogous, triadic, tetradic, square and monochromatic harmonies; and calculates sRGB relative luminance and WCAG contrast ratios.

Locked swatches are preserved during reroll. CSS export is native and local. Display-P3 conversion, color-vision-deficiency simulation and AI suggestions remain future additions with separate validation.

AA labels represent the current selected swatch against the displayed background only. They do not certify an entire palette.
