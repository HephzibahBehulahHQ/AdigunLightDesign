# AdigunLightDesign help

The top-right row contains save status, Account, Language, Settings, Search and
Help. Account currently shows guest because frontend authentication is pending.
Settings changes appearance. Search finds fixtures, active-canvas objects/colors,
cues and saved palette names; selecting a saved palette opens its comparison.
The globe keeps all four languages available. Narrow screens hide the save text.

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

- [The live co-pilot](#the-live-co-pilot)

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
focused field or when the page is hidden. Closing the Lux panel also stops new
offers from appearing. Changing project state removes the displayed suggestion.

**Accept** is currently disabled: accepting changes requires real login, which
is not configured. The live co-pilot does not modify or save the project.
Authenticated preview, acceptance, undo and rollback are still required work.
Existing manual editor actions and the separate request-based Lux action path
retain their current behavior; they do not demonstrate live acceptance.

Expand **What does this do?** to inspect the selected fixture, palette swatch or
2D object. Facts refresh from the local project: fixture profile, saved virtual
dimmer, patch and cue membership; swatch color, opacity and lock; or object type,
position, fill and size. Virtual values do not establish physical brightness or
hardware output. Explanations use the current selection, not hover detection.

Broader incomplete-workflow analysis and live browser verification remain
pending. No electrical-ladder analysis or physical DMX feedback is provided.
