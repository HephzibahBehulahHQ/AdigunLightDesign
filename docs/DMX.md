# DMX

M4 provides internal virtual DMX with numbered universes, channels 1–512,
overlap detection, bounded footprints, 512-channel frames, and local blackout.
The library provides a six-channel RGB wash, ten-channel RGBW moving head, and
four-channel LED strip. Adding a fixture from the editor uses the first address
that fits in the lowest available universe. New room starter rigs use the same
allocator. Manually entering a patch validates the selected universe and address.
The timeline reports the selected fixture's universe and the number of channels
patched in that universe in the current room. Chrome checks adding all three
library profiles and repatching into universe 2.

The profile is application-defined and marked virtual; it is not a manufacturer, GDTF or hardware-validated record. The virtual frame never opens a network socket, controls hardware or implies Art-Net/sACN support. A future output bridge must be separately activated and show a visible live-output state and emergency-disable path.
