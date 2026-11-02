# AdigunLightDesign help

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
