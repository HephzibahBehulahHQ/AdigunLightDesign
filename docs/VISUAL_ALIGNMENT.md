# Visual alignment evidence

The user reaffirmed the delivery reference on 3 November 2026:
`codex-clipboard-5b6caab9-9259-4364-a4d9-642494b849c2.png`.
The original attachment is a 1672 × 941 PNG, SHA-256
`13b35cd250ac8c587b9696fd802b57703e406c2894968003cf1a8f45dee126c4`.
Use this composition and styling as the visual acceptance target, incorporating
the explicitly requested floating Bot and compact top-menu updates. The
1440 × 900 desktop check remains additional responsive coverage. This reference
identification is not evidence that the current interface matches it.

Studio camera corrections now honor the document's positive-Z rear-wall
convention, keeping that wall behind the sofa instead of between the viewer and
furniture. The camera aims at 55% of room height, rather than near the floor.
The generic OpenGL matrix helper remains unchanged. Projection/depth tests cover
both perspective and orthographic picking, including near-equal projected-center
distances where the closer fixture must win.

The viewport has functional X/Y/Z view buttons, localized labels and keyboard
access. Camera orientation/zoom survives editor re-renders in session memory.
Axis changes reuse geometry buffers and remain disabled without WebGL. Y is an
overhead exterior view; the existing ceiling remains real geometry. These are
math/lifecycle guarantees, not screenshot evidence or exact visual acceptance.

Latest camera validation: the full local suite passed 221 tests, zero failures
or skips; project checks and the Vite build passed. Renderer checks also verify
that axis changes reuse geometry and camera snapshots are defensive copies.
The build remains Auth-unconfigured, and no editor deployment was performed.

The 3 November desktop reference remains the visual target for the studio and
controls. The user later explicitly rejected the five-card project-overview
strip and dead workspace; that correction takes precedence for the editor layout.

Keep the workspace to the top header/navigation, bottom status trailer,
full-height left layers/tools, central scene with palette and timeline dock, and
full-height right inspector. Do not add internal implementation, milestone,
constraint or placeholder cards to the working area.

Desktop uses three tracks: left tools, center scene/dock, right inspector. Lux
floats outside the grid and reserves right-side room only while open. Live
browser checks at 1880 × 690 and 1672 × 941 confirmed that the editor fills the
available frame without page overflow.

The WebGL scene remains an artistic previsualization rather than calibrated
photometry. Exact visual match, richer material fidelity and hardware
performance acceptance remain open.

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

Studio props now include nested round coffee tables, sofa seat/cushion detail
and vertical acoustic slats following the configured right-wall dimensions.
They are native scene geometry receiving the existing artistic lighting and
obey the props visibility control. Geometry tests cover finite bounds, closed
table topology, room-sized slats and lighting response. No photorealistic
materials, calibrated reflections or exact reference appearance is established.

At desktop widths starting at 1100px, the studio uses a viewport-height shell
with docked left tools, central canvas, palette/timeline and right inspector.
When Lux is open at the right edge, the shell reserves its width so it does not
cover the workspace.

PR #83 extended this layout to the laptop targets 1280 × 720, 1366 × 768,
1440 × 900 and 1920 × 1080. Playwright checks on the deployed release confirm
no document overflow, no collision between the workspace and Lux, and working
2D/3D view switching. These checks do not prove exact-reference match or
additional mobile geometry.

Generic preview fixtures now have aimed cylindrical housings, lens rims, colored lens faces and support brackets instead of a single colored box. Geometry follows the same artistic target as the beam; this is a generic visual model, not manufacturer geometry or calibrated mechanical movement. Automated geometry/renderer tests cover finite triangles, aim response, lens color and nonmutation. Exact rendered resemblance remains unverified.

The selected-fixture frame now derives its bounds from every actual housing vertex, with 4cm visual padding. It follows pan/tilt aiming rather than retaining the former small box around the old fixture marker. Tests verify enclosure for multiple aiming directions and renderer buffer lifecycle. This is a selection aid, not physical clearance or collision validation.

The compact studio now places project/layers/tools/fixtures in a docked left rail, the WebGL viewport above the palette and cue timeline, and the fixture/light/DMX/effects inspector with Lux in a docked right rail. The app shell remains constrained to the viewport; the fixture list and inspector retain their own scroll areas. Browser geometry checks at 1920 × 1080, 1880 × 690, 1855 × 829, 1672 × 941, 1440 × 900, 1366 × 768 and 1754 × 878 showed no document overflow, overlapping primary columns, displaced canvas, or displaced inspector/Lux dock. At 1754 × 878, the left rail measured 233px, right inspector 296px, and center workspace 1189px. These are layout checks; they do not claim pixel-identical artwork or identical fixture counts to the supplied example project.

Ordinary project renders now retain the existing WebGL canvas and renderer when scene configuration is unchanged, updating fixture data only when fixture state changes. A focused lifecycle test covers renderer reuse and rebuild conditions. The compact fixture list and palette summary are generated from actual project state, and Lux remains offline until configured. Local validation passed: contract check, lint, typecheck, 275 tests and production build. Browser DOM inspection confirmed the actual three-fixture starter project, fixture selection controls and docked sections; the supplied reference's nine fixtures require its project data and are not fabricated by the layout.
