# Visual alignment evidence

The user's supplied desktop reference remains the acceptance target. Current
source layout includes the brand/navigation header, layers/tools, scene viewport,
fixture inspector, palette, timeline and Lux panel. A five-card lower overview
now follows the editor: product branding, available features, implementation,
milestones and honest integration constraints. All overview copy has four locale
entries. Desktop workspace height reserves room for this strip; narrow screens
reflow the cards into three columns, then one.

The overview reports the actual static/WebGL stack and three generic fixture
profiles. It does not repeat the reference's unsupported claims of delivered
20,000-profile data, advanced interchange exports or a configured live AI service.
The brand card uses a code-native lighting icon, not a new corporate logo.

This is a source-level alignment change. No screenshot comparison, measured
pixel difference, browser layout acceptance or exact visual match is established.
The studio rendering, typography, density and reference artwork still require
visual verification and further refinement. This document is not acceptance.

The renderer now retains the selected fixture's outline when cue/effect preview
updates supply fixture values without UI selection markers. Explicit selection
flags still replace that selection; removal drops the missing fixture naturally.
A mocked WebGL regression checks retained outline geometry, explicit deselection
and absence of mutation in source fixtures. This does not verify the outline's
browser appearance against the reference.

The primary timeline now displays the existing scheduled track arrangement,
including its actual cue start times, independent colored lanes and a time ruler.
The sequential view remains in an expandable section and opens when sequence
playback starts. Both playheads and playback controls remain present. Markup
tests cover track separation, scheduled proportions, selected cues, empty state
and escaping. Browser interaction and reference matching remain unverified.

Fixture dimmer and beam controls now use keyboard-accessible native sliders.
Intensity displays the normalized percentage alongside the exact 0–255 channel
value; beam displays its actual 0–255 value without inventing a calibrated angle.
Changes remain staged until the existing Apply action commits the validated,
undoable fixture transaction. A handler test covers exact values, endpoint labels,
missing profile controls and accessible value text. Browser interaction remains
unverified.

The Measure tool now performs temporary 2D canvas-coordinate measurements using
SVG screen transforms. It has pointer and keyboard operation, a visible line and
distance label, localized instructions and live status output. Measurement mode
does not bind object dragging. Focused tests cover scaled coordinates, pointer
identity, cancellation, keyboard increments/reset and cleanup. No physical-unit
calibration or browser interaction acceptance is claimed.

The reference's implemented tool shortcuts now invoke their existing button
actions. Enabled tools expose `aria-keyshortcuts` and shortcut tooltips. Text
editing, composition, modifier combinations, handled events and repeated
keydowns are excluded. Disabled AI Pin stays unavailable. Focused shortcut
tests passed; real-browser keyboard/focus acceptance remains pending.
