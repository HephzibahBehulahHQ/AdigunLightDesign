# DMX

M4 provides an internal virtual-DMX model only. It supports numbered universes, channels 1–512, a documented six-channel generic RGB wash profile, automatic first-free address allocation, overlap detection, bounded footprints, 512-channel frames and local blackout.

The profile is application-defined and marked virtual; it is not a manufacturer, GDTF or hardware-validated record. The virtual frame never opens a network socket, controls hardware or implies Art-Net/sACN support. A future output bridge must be separately activated and show a visible live-output state and emergency-disable path.
