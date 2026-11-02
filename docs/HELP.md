# AdigunLightDesign help

The top-right row contains save status, Account, Language, Settings, Search and
Help. Account shows guest until a configured build verifies a registered login.
Settings changes appearance. Search finds fixtures, active-canvas objects/colors,
cues and saved palette names; selecting a saved palette opens its comparison.
The globe keeps all four languages available. Narrow screens hide the save text.

In the 3D viewport, use X/Y/Z to choose an axis view. Y looks down from above,
including the ceiling; Z returns to a straight front view. The canvas keeps
keyboard focus for orbit/zoom after a view change. Camera orientation and zoom
survive editor updates within the current session; Reset camera/Home restores
the starting view. These controls require WebGL and do not change project data.

If sign-in is enabled for the build, Account accepts an existing account's email
and password. The password field clears after each attempt. Sessions remain in
memory and end on reload; sign-out affects this session. Registration, email-link
flows and cloud saving are not available yet. An unconfigured build explains why
sign-in is unavailable and continues to support local editing.

In the fixture inspector's Light tab, use the intensity and beam sliders, then
Apply to commit. Intensity percentage is a normalized virtual channel value,
not measured brightness. Beam is an uncalibrated 0–255 control, not degrees.

Choose Measure to open the 2D canvas. Drag between two points to measure their
distance in canvas coordinates. With the canvas focused, arrows move the endpoint,
Shift moves ten units, Enter sets the starting point and Escape resets. The
measurement is temporary and excluded from project saves and exports. These
coordinates are not physical room measurements. Canceling a pointer gesture
restores the previous measurement and never moves canvas objects.

Outside text fields, use V for Select, B for Palette Brush, L for Fixture,
M for Material, T for Text, S for Shape, R for Measure and O for Orbit. These
invoke the same tool actions as clicking their buttons. Text and Shape create
an object once per key press. Disabled tools remain unavailable by keyboard;
AI Pin has no active shortcut while its tool is disabled. Ctrl/Cmd+S and
Ctrl/Cmd+Z retain their Save and Undo behavior.

## Contents

- [Using the Bot window](#using-the-bot-window)
- [The live co-pilot](#the-live-co-pilot)

## Using the Bot window

Use AI Co-Pilot in the navigation to open or restore Lux. It floats above the
workspace without a modal backdrop. Drag its title bar to move it, or focus
the title bar and use arrows (Shift moves ten pixels). Drag the bottom-right
handle to resize; its arrow keys also resize it. The window stays within the
viewport. On small screens it fills the screen and retains a close control.

The title-bar controls minimize to a compact bar, maximize with an outer margin,
restore previous geometry and close. Escape inside the window closes it and
returns focus to the AI control. Reopening focuses the chat input. Normal Tab
navigation remains available; the window does not trap focus from the canvas.

Position, size, minimized/maximized and open/closed state are saved locally per
project. Storage failure leaves an in-memory layout and reports that it could
not be saved. Account-backed layout synchronization is not implemented yet.

New local suggestions and service replies mark the AI navigation control and
announce a status notification without opening the window or moving focus.
Opening or focusing the window acknowledges unread state. Moving or resizing
the window never saves project design data. Browser/touch interaction and actual
canvas interaction around the window remain unverified; automated coverage uses
state and event-surface tests.

## The live co-pilot

Open the Lux panel and use **Live co-pilot · local** to turn local suggestions
on or off. Guests can use it. It observes current project state without sending
network requests. Remote Lux chat is a separate optional service requiring
configuration and explicit consent for each request.

The current local analyzer offers help for fixtures with no virtual DMX patch
and asks about your project goal. These are informational offers, not hardware
fault diagnoses. Enter your goal under **Project goal** and choose **Remember
for this session**. The answer is held in memory, not saved to the project.

The analyzer also identifies channels targeted by multiple timeline tracks.
Later tracks in first-appearance order take priority once they start targeting
a channel, including values held between cues. This can be intentional layering;
the message is informational and does not declare the show unsafe or invalid.

Suggestions appear inside the existing panel. **Dismiss** suppresses an offer
for two minutes; **Tell me more** expands its explanation. Suggestions are
limited to one per 25 seconds and suppressed while dragging, typing, editing a
focused field or when the page is hidden. Closing Lux keeps suggestions
non-blocking: new offers set its navigation badge without reopening it. Changing
project state removes the displayed suggestion.

**Accept** requires a verified registered account. In a configured build, an
unpatched-fixture offer opens a proposed virtual-universe-1 patch using the first
free address range. Review the exact before/after data, then Confirm to apply.
Cancel, changed project/account state or unavailable addresses prevent the action.
The unconfigured default build keeps authenticated acceptance unavailable.

All Bot mutation confirmations, including request-based Lux suggestions and
local palette actions, now recheck login and apply changes only in memory.
They never automatically save the project. Use Save to persist locally or Undo
to restore the previous state. Ordinary manual editing keeps its existing local
saving behavior. Live Auth and browser acceptance remain unverified.

Expand **What does this do?** to inspect the selected fixture, palette swatch or
2D object. Facts refresh from the local project: fixture profile, saved virtual
dimmer, patch and cue membership; swatch color, opacity and lock; or object type,
position, fill and size. Virtual values do not establish physical brightness or
hardware output. Explanations use the current selection, not hover detection.

Broader incomplete-workflow analysis and live browser verification remain
pending. No electrical-ladder analysis or physical DMX feedback is provided.

In 2D, select a rectangle or ellipse and drag its cyan lower-right handle to resize. Release to commit one undoable size change; pointer cancellation restores the original. Width and height remain editable in the inspector for keyboard operation. Text uses its font-size control.
