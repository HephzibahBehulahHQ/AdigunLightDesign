# Color engine

The initial deterministic engine accepts HEX values, converts between RGB and HSL, generates complementary, split-complementary, analogous, triadic, tetradic, square and monochromatic harmonies, and calculates sRGB relative luminance and WCAG contrast ratios.

Locked swatches are preserved during reroll. CSS export is native and local. The starter UI does not yet claim CIELAB, LCH, OKLab, Display-P3, image extraction, color-vision-deficiency simulation or AI suggestions; those remain future additions with separate validation.

AA labels represent the current selected swatch against the displayed background only. They do not certify an entire palette.
