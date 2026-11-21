# DMX

M4 provides internal virtual DMX with numbered universes, channels 1–512,
overlap detection, bounded footprints, 512-channel frames, and local blackout.
The library provides a six-channel RGB wash, ten-channel RGBW moving head, and
four-channel LED strip. Adding a fixture from the editor uses the first address
that fits in the lowest available universe. Manually entering a patch validates
the selected universe and address. Chrome checks adding and patching all three
library profiles.

The profile is application-defined and marked virtual; it is not a manufacturer, GDTF or hardware-validated record. The virtual frame never opens a network socket, controls hardware or implies Art-Net/sACN support. A future output bridge must be separately activated and show a visible live-output state and emergency-disable path.
