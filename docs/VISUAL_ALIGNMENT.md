# Visual alignment evidence

The active visual acceptance target is the owner-supplied
`codex-clipboard-9cef8ab1-5bd2-4d04-9335-9c566861962d.png`, provided
14 November 2026. The image is 1754 × 896; the application viewport is
1754 × 878, with 18px below the footer. SHA-256:
`e6360f05dd72a7b19e43a521a3ec7771dd8d57011bf383cf13c0d34c398691af`.
This target supersedes the 3 November screenshot for current layout comparisons.
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

Historical camera validation, before the compact-studio releases: 221 tests
passed with zero failures or skips; project checks and the Vite build passed.
The build was Auth-unconfigured at that time.
The 3 November screenshot is historical; current layout comparisons use the
14 November target. The correction rejecting the five-card project overview
and dead workspace remains binding.
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
and escaping. The current browser acceptance runner verifies timeline playback and fixed canvas bounds; the active reference layout was compared at 1754 × 878.

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

The compact studio uses a docked left rail, fixed central WebGL viewport with
palette/timeline dock, and a right fixture inspector with docked Lux. Panels
scroll independently; the document remains viewport-constrained.

PR #163 fixed Virtual Blackout placement: the button is created with the timeline
controls, then moved into the Fixtures ribbon before event binding. The live
button applies virtual blackout and reports that physical output remains
disabled. PR #164 tightened the left gutter and shifted the center workspace to
the 14 November reference. Both PRs merged; validation and GitHub Pages release
checks passed.

Live measurement at 1754 × 878 after PR #164: left rail x=12, y=140,
231.52 × 686px; center toolbar, scene and dock x=257.52 through x=1440;
right inspector x=1448, 296 × 686px; footer y=840, 38px high. The browser
acceptance runner passes at 1920 × 1080, 1880 × 690, 1855 × 829, 1672 × 941,
1440 × 900, 1366 × 768 and 1754 × 878, with no document overflow or panel
overlap. It also verifies tools, canvas stability, timeline playback, fixture
selection, project save/reload and JSON import/export. The latest local suite
passed 278 tests; contract check, lint and production build passed. The live
Blackout click was separately verified without runtime errors.

The default Studio Mood project contains nine actual fixtures: three moving
heads, four RGB washes and two LED strips. The reference depicts a different
room rendering; the WebGL view remains driven by real project scene and fixture
data. Exact scene-art parity remains open and must not be achieved by replacing
saved project data or rendering a static placeholder.

The desktop tool grid exposes the eight supported editing tools. AI Pin remains
outside that grid because it is not an active editing command.

