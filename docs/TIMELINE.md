# Cue timeline

M5 stores cue snapshots separately from renderer state. A cue records fixture property targets, duration, fade metadata and keyframe boundary records. Playback uses deterministic numeric interpolation from the current virtual fixture state to the stored target; it updates only the internal virtual fixture state.

The current controls create a cue snapshot, apply a selected palette swatch to virtual RGB fixtures, play the selected cue, pause/stop playback and keep the virtual DMX frame local. The implementation does not send DMX to physical devices, synchronize a console or claim real-time hardware timing.
