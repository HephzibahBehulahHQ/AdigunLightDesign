Warning: truncated output (original token count: 3110)
Total output lines: 87

# Architecture

## Product layers

The production frontend now uses pinned Vite bundling and the pinned Supabase
browser SDK for optional account handling. Domain modules, project format and
validated commands are preserved. The output remains static-hostable; missing
public Auth configuration leaves local editing available and account operations
unavailable. No runtime secret is embedded. This supersedes the initial
dependency-free packaging choice without claiming the remaining framework,
type-checking or browser acceptance gates are complete.

Browser-storage access handles denied access and quota failures. A new or unsuccessfully saved project shows an in-memory state instead of a saved indicator; editing continues in the active session and native JSON export remains available. The indicator changes to saved only after a successful storage write or loading a valid stored project. This does not provide recovery after the page closes without a successful save/export. Storage failure adapters have automated tests; browser failure paths remain unverified.

```text
Accessible editor UI
        │
Application commands / undo transactions
        │
Versioned project document + domain validators
  ┌─────┼─────────┬──────────┬─────────┐
palette scene    fixture     DMX      cue
  │       │         │         │
storage renderer  library    bridge   export / AI adapters
```

The project document is authoritative. The timeline, inspector and eventual 3D viewport never own competing fixture state. A cue evaluates to a virtual DMX frame and a renderer consumes that result. A hardware bridge, when implemented, is an explicit consumer of virtual DMX state and not a browser-native promise.

Direct editor mutations use document transactions. Each committed operation snapshots the full project document, records a bounded audit label, clears stale redo state and supports project-wide undo/redo. This applies to palette, scene, fixture, DMX, cue and project-name edits; live cue simulation remains explicitly separate from external output.

## Versioned project format

`Project` will include `id`, `schemaVersion`, identity metadata, preferences, palettes, scenes, fixtures, patches, cues, assets and history. Import validates before conversion, retains unsupported data in a documented extension bag, and never silently drops values. Every schema revision requires a migration and a serialization test.

## Milestone sequence

1. M0 audit and foundations.
2. M1 shell: design tokens, four locales, responsive editor composition and editor state.
3. M2 palette: deterministic color conversions, harmony, locks/reroll, contrast, local save and exports.
4. M3 3D: scene graph, selectable geometry, camera and non-certified lighting previsualization.
5. M4 virtual fixtures and DMX: profile schema, patching and 1–512 allocation validation.
6. M5 cue state:…1610 tokens truncated… not perform mesh raycasting or prop occlusion testing. Layer-list selection remains the keyboard-accessible alternative. Projection tests do not establish browser interaction acceptance.

The viewport projection control toggles perspective and orthographic modes and persists the choice locally. Both retain orbit and zoom; changing mode rebuilds the viewport at its default camera pose. Orthographic zoom changes the view volume, preserving depth-independent object size. Matrix behavior has automated coverage; actual browser appearance remains unverified.

The studio geometry includes two potted plants with curved, segmented leaves and visible midribs, a side chair and a floor-lamp model alongside the sofa, table and shelf. These procedural, vertex-colored approximations receive face-oriented, two-sided diffuse fixture spill with distance attenuation. Soft contact occlusion beneath the chair, floor lamp, plants and shelf follows props-layer visibility. These remain artistic preview effects; they are not calibrated photometry, and the decorative lamp does not add a calibrated light source. Geometry tests do not establish photorealism or screenshot fidelity.

Layer visibility buttons save optional boolean `scene.visibility` settings for lighting, props and the palette panel through undoable transactions. Hiding lighting removes its preview geometry and artistic surface contribution, while virtual DMX and cue data stay unchanged. Hiding props retains the room and rig. Legacy scenes default to visible layers. These controls affect previews and panel visibility, not physical output. Domain geometry and import validation have coverage; browser interaction remains unverified.

The inspector has functional Fixture and Palette selectors. Opening 3D selects fixture controls; opening 2D or selecting a swatch selects palette controls. The choice persists locally. Hidden controls retain their handlers, and fixture editing remains available when WebGL is unavailable. Browser interaction and visual acceptance are still unverified.

At desktop sizes above 1320 × 700, the editor grid places the toolbar across the viewport and inspector, with the palette/timeline row spanning the same combined width below. The project rail and Lux panel span the editor height. Secondary controls scroll inside their panels. Smaller windows retain the existing stacked layout. This structural change has not been visually accepted against the reference; browser screenshot verification remains required.

The desktop target is a 1440 × 900 dark navy editor. Its surface hierarchy is: brand/header; module navigation; left workspace rail; central canvas/viewport; inspector; palette/timeline; one assistant panel. Narrow layouts collapse secondary panels rather than creating page overflow. Exact visual comparison needs the production corporate logo asset, licensed imagery and a browser regression baseline; absent assets must not be substituted with fabricated equivalents.



