# Cue timeline

Virtual effect previews provide a cosine dimmer pulse and an ordered dimmer chase with an editable cycle of 0.1–120 seconds. Both loop until Stop or a document mutation. They evaluate cloned fixture data and change only rendered preview intensity; they do not save effect settings, alter cue snapshots, or transmit hardware output. Deterministic phase, wraparound, bounds and immutability have domain tests; browser playback remains unverified.

M5 stores cue snapshots separately from renderer state. A cue records fixture property targets, duration, delay, fade metadata and keyframe boundary records. Playback interpolates from a snapshot of the current fixtures to the stored target and sends preview values to the renderer. Playback does not overwrite or save the project's fixture values. Stop and completion restore the saved scene on the next render.

The controls capture cues with editable duration, fade and delay, select a cue, edit its name and timing, play it, and stop it. Cue edits preserve captured fixture targets and use project undo/redo. Import, undo, redo and document mutations stop playback. Delay holds the starting values; a zero-length fade switches at the scheduled delay. Timing must fit within the cue duration. The displayed virtual DMX frame represents saved fixture values, not the animated preview.

Play sequence opens the 3D preview and evaluates cues in their stored order. Each cue starts from the previous cue's completed fixture values. Boundary transitions, completion, empty sequences and preservation of source data have automated coverage. Stop cancels the sequence and restores the saved scene.

Earlier/Later controls move the selected cue one position in the stored sequence. Boundary controls are disabled. Reordering is undoable, preserves cue snapshots and stops any running preview.

Pause/resume freezes the elapsed playback clock for cues, sequences and effect previews. Resume excludes paused wall time; repeated pause/resume requests do not shift timing. Stop still restores saved fixture values. Domain clock behavior has automated coverage. Scrubbing and hardware output remain unimplemented. The implementation does not send DMX to physical devices, synchronize a console or claim real-time hardware timing. Browser interaction and visual acceptance remain unverified.
