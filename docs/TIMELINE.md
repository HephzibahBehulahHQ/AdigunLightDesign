# Cue timeline

M5 stores cue snapshots separately from renderer state. A cue records fixture property targets, duration, delay, fade metadata and keyframe boundary records. Playback interpolates from a snapshot of the current fixtures to the stored target and sends preview values to the renderer. Playback does not overwrite or save the project's fixture values. Stop and completion restore the saved scene on the next render.

The controls capture cues with editable duration, fade and delay, select a cue, edit its name and timing, play it, and stop it. Cue edits preserve captured fixture targets and use project undo/redo. Import, undo, redo and document mutations stop playback. Delay holds the starting values; a zero-length fade switches at the scheduled delay. Timing must fit within the cue duration. The displayed virtual DMX frame represents saved fixture values, not the animated preview.

Play sequence opens the 3D preview and evaluates cues in their stored order. Each cue starts from the previous cue's completed fixture values. Boundary transitions, completion, empty sequences and preservation of source data have automated coverage. Stop cancels the sequence and restores the saved scene.

Pause/resume, track reordering, scrubbing and hardware output remain unimplemented. The implementation does not send DMX to physical devices, synchronize a console or claim real-time hardware timing. Browser interaction and visual acceptance remain unverified; domain timing and snapshot behavior have automated coverage.
