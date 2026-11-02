# Architecture

## Product layers

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
6. M5 cue state: tracks, deterministic interpolation and playback.
7. M6 Lux: backend-mediated authenticated tools, previews, receipts and undo.
8. M7 exports; M8 security, accessibility, performance, deployment and documentation hardening.

## Visual acceptance

2D objects support pointer dragging. SVG screen-coordinate transforms account for scaling and letterboxing; movement previews locally and commits one undoable position change on release. Pointer cancellation restores the original transform without saving. Numeric fields remain available for keyboard positioning. Mocked interaction tests cover scaled movement, cancellation and click selection; real browser pointer behavior remains unverified.

The 2D view renders saved SVG rectangles/text rather than the static studio concept. Shape/Text tools create objects using the selected swatch. Click or keyboard selection opens numeric position/size and text controls; paint and delete use project undo/redo. Optional `scene.canvasObjects` persists in native files with bounded geometry/text and escaped markup. Standalone SVG export and pointer translation are available. Drag resizing, arbitrary paths and advanced text layout remain unimplemented. Domain/import/markup tests do not establish browser interaction or visual acceptance.

The paint-surface selector applies the selected swatch's RGB color to walls, floor, ceiling or decorative accents. Surface colors persist as optional `scene.materials` HEX values and use document undo/redo. They change actual vertex colors consumed by artistic lighting, rather than only a UI swatch. Surface opacity, texture maps and physically based roughness/metalness are not implemented. Geometry/color and native validation have tests; browser appearance remains unverified.

Beam geometry renders in a separate additive transparency pass after opaque room/fixture geometry, with depth testing retained and depth writes disabled for beams. GPU blend/depth state is restored afterward. Buffer separation and blackout/visibility behavior have tests. This remains an artistic cone approximation without volumetric scattering, calibrated haze or photometric validation; browser appearance and reference matching are unverified.

Fixture duplication preserves profile/mode and properties, offsets X by 0.5 m and allocates a free patch in the source universe. It fails if no contiguous space exists. Fixture deletion removes its patch, group memberships, cue targets and channel keyframes; empty groups are removed. Both are undoable. Removing the final fixture is supported. Copies do not automatically join groups or captured cues. Browser interaction remains unverified.

Room dimensions are optional `scene.room` values in meters: width/depth 2–50 and height 2–20, with legacy defaults 10 × 4 × 8. Undoable controls resize the cutaway floor, two walls and ceiling. Fixtures, rig and furniture retain their world coordinates; no automatic arrangement, collision checking or room-fit guarantee is claimed. The remaining sides stay open for viewing. Native validation rejects malformed dimensions. Geometry bounds and persistence have tests; rendered appearance is unverified.

Clicking near a projected fixture center selects it and opens its inspector. Dragging continues to orbit; pointer cancellation does not select. Picking considers the first 12 rendered fixtures, rejects clipped points, and uses a 28 CSS-pixel hit radius with depth tie-breaking. It does not perform mesh raycasting or prop occlusion testing. Layer-list selection remains the keyboard-accessible alternative. Projection tests do not establish browser interaction acceptance.

The viewport projection control toggles perspective and orthographic modes and persists the choice locally. Both retain orbit and zoom; changing mode rebuilds the viewport at its default camera pose. Orthographic zoom changes the view volume, preserving depth-independent object size. Matrix behavior has automated coverage; actual browser appearance remains unverified.

The studio geometry includes two potted plants, a side chair and a floor-lamp model alongside the sofa, table and shelf. These are procedural, vertex-colored approximations that receive the existing artistic fixture spill and follow props-layer visibility. The decorative lamp does not add a calibrated light source. Geometry tests do not establish photorealism or screenshot fidelity.

Layer visibility buttons save optional boolean `scene.visibility` settings for lighting, props and the palette panel through undoable transactions. Hiding lighting removes its preview geometry and artistic surface contribution, while virtual DMX and cue data stay unchanged. Hiding props retains the room and rig. Legacy scenes default to visible layers. These controls affect previews and panel visibility, not physical output. Domain geometry and import validation have coverage; browser interaction remains unverified.

The inspector has functional Fixture and Palette selectors. Opening 3D selects fixture controls; opening 2D or selecting a swatch selects palette controls. The choice persists locally. Hidden controls retain their handlers, and fixture editing remains available when WebGL is unavailable. Browser interaction and visual acceptance are still unverified.

At desktop sizes above 1320 × 700, the editor grid places the toolbar across the viewport and inspector, with the palette/timeline row spanning the same combined width below. The project rail and Lux panel span the editor height. Secondary controls scroll inside their panels. Smaller windows retain the existing stacked layout. This structural change has not been visually accepted against the reference; browser screenshot verification remains required.

The desktop target is a 1440 × 900 dark navy editor. Its surface hierarchy is: brand/header; module navigation; left workspace rail; central canvas/viewport; inspector; palette/timeline; one assistant panel. Narrow layouts collapse secondary panels rather than creating page overflow. Exact visual comparison needs the production corporate logo asset, licensed imagery and a browser regression baseline; absent assets must not be substituted with fabricated equivalents.

