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
6. M5 cue state: tracks, deterministic interpolation and playback.
7. M6 Lux: backend-mediated authenticated tools, previews, receipts and undo.
8. M7 exports; M8 security, accessibility, performance, deployment and documentation hardening.

## Visual acceptance

The viewport toolbar supports native fullscreen when the browser exposes it. An exit button appears inside the fullscreen viewport; browser Escape behavior remains available. Unsupported capabilities disable entry, and rejected requests report a localized status. The existing resize observer redraws the 3D canvas at its new size. Mocked API tests do not establish real browser fullscreen or screenshot acceptance.

An optional stage platform is an actual box in the 3D scene. Saved controls set visibility, position, width/height/depth and opaque color through undoable transactions. The stage follows props-layer visibility and receives the artistic lighting pass. Existing scenes default to no stage. Furniture does not automatically move onto the platform; no structural-load, collision or safety calculation is provided. Geometry and native validation have tests; browser appearance remains unverified.

Preview modes use explicit rendering budgets: Performance 4 fixtures/1× pixel ratio, Balanced 12/1.5×, Quality 32/2×. Surface subdivisions also increase with quality. The viewport reports rendered/total fixtures; excess fixtures retain project/DMX data but do not contribute to the preview. Picking uses the same budget. Mode choice persists locally and resets the camera when rebuilding. These are chosen limits, not measured frame-rate guarantees; hardware performance and browser appearance remain unverified.

Fixture yaw is editable in degrees and rotates the virtual pan/tilt beam target around the fixture's world position. It is a scene transform, not a transmitted DMX channel. The simplified fixture housing does not model full mechanical orientation, and no manufacturer aiming calibration is claimed. Rotation/position preservation has automated coverage; browser appearance remains unverified.

The fixture inspector groups existing controls into Fixture (identity/placement), Light (color/intensity/aiming), DMX (patching) and Effects tabs. Effects are explicitly labeled as applying to all virtual fixtures. Selecting a palette swatch opens palette controls instead; the fixture layer list returns to fixture inspection. Tabs reuse the existing validated actions. Their browser interaction and exact layout remain unverified.

The 2D shape selector creates rectangles or ellipses; both use editable bounding-box position and dimensions. Object duplication creates an independent copy offset by 20 canvas units. Backward/Forward moves change saved stacking order one step at a time and are undoable. SVG export preserves these shapes and order. Geometry/copy/order tests do not verify browser interaction.

2D objects support pointer dragging. SVG screen-coordinate transforms account for scaling and letterboxing; movement previews locally and commits one undoable position change on release. Pointer cancellation restores the original transform without saving. Numeric fields remain available for keyboard positioning. Mocked interaction tests cover scaled movement, cancellation and click selection; real browser pointer behavior remains unverified.

The 2D view renders saved SVG rectangles/text rather than the static studio concept. Shape/Text tools create objects using the selected swatch. Click or keyboard selection opens numeric position/size and text controls; paint and delete use project undo/redo. Optional `scene.canvasObjects` persists in native files with bounded geometry/text and escaped markup. Standalone SVG export and pointer translation are available. Selected rectangles and ellipses support southeast-handle pointer resizing, with temporary preview, bounded dimensions and one undoable commit on release. Cancellation restores the preview without saving. Numeric size controls remain the keyboard alternative. Arbitrary paths and advanced text layout remain unimplemented. Domain/import/markup tests do not establish browser interaction or visual acceptance.

The paint-surface selector applies the selected swatch's RGB color to walls, floor, ceiling or decorative accents. Surface colors persist as optional `scene.materials` HEX values and use document undo/redo. They change actual vertex colors consumed by artistic lighting, rather than only a UI swatch. Surface opacity, texture maps and physically based roughness/metalness are not implemented. Geometry/color and native validation have tests; browser appearance remains unverified.

Beam geometry renders in a separate additive transparency pass after opaque room/fixture geometry, with depth testing retained and depth writes disabled for beams. GPU blend/depth state is restored afterward. Buffer separation and blackout/visibility behavior have tests. This remains an artistic cone approximation without volumetric scattering, calibrated haze or photometric validation; browser appearance and reference matching are unverified.

Fixture duplication preserves profile/mode and properties, offsets X by 0.5 m and allocates a free patch in the source universe. It fails if no contiguous space exists. Fixture deletion removes its patch, group memberships, cue targets and channel keyframes; empty groups are removed. Both are undoable. Removing the final fixture is supported. Copies do not automatically join groups or captured cues. Browser interaction remains unverified.

Room dimensions are optional `scene.room` values in meters: width/depth 2–50 and height 2–20, with legacy defaults 10 × 4 × 8. Undoable controls resize the cutaway floor, two walls and ceiling. Fixtures, rig and furniture retain their world coordinates; no automatic arrangement, collision checking or room-fit guarantee is claimed. The remaining sides stay open for viewing. Native validation rejects malformed dimensions. Geometry bounds and persistence have tests; rendered appearance is unverified.

Clicking near a projected fixture center selects it and opens its inspector. Dragging continues to orbit; pointer cancellation does not select. Picking considers the first 12 rendered fixtures, rejects clipped points, and uses a 28 CSS-pixel hit radius with depth tie-breaking. It does not perform mesh raycasting or prop occlusion testing. Layer-list selection remains the keyboard-accessible alternative. Projection tests do not establish browser interaction acceptance.

The viewport projection control toggles perspective and orthographic modes and persists the choice locally. Both retain orbit and zoom; changing mode rebuilds the viewport at its default camera pose. Orthographic zoom changes the view volume, preserving depth-independent object size. Matrix behavior has automated coverage; actual browser appearance remains unverified.

The studio geometry includes two potted plants, a side chair and a floor-lamp model alongside the sofa, table and shelf. These procedural, vertex-colored approximations receive face-oriented, two-sided diffuse fixture spill with distance attenuation. Soft contact occlusion beneath the chair, floor lamp, plants and shelf follows props-layer visibility. These remain artistic preview effects; they are not calibrated photometry, and the decorative lamp does not add a calibrated light source. Geometry tests do not establish photorealism or screenshot fidelity.

Layer visibility buttons save optional boolean `scene.visibility` settings for lighting, props and the palette panel through undoable transactions. Hiding lighting removes its preview geometry and artistic surface contribution, while virtual DMX and cue data stay unchanged. Hiding props retains the room and rig. Legacy scenes default to visible layers. These controls affect previews and panel visibility, not physical output. Domain geometry and import validation have coverage; browser interaction remains unverified.

The inspector has functional Fixture and Palette selectors. Opening 3D selects fixture controls; opening 2D or selecting a swatch selects palette controls. The choice persists locally. Hidden controls retain their handlers, and fixture editing remains available when WebGL is unavailable. Browser interaction and visual acceptance are still unverified.

At desktop sizes above 1320 × 700, the editor grid places the toolbar across the viewport and inspector, with the palette/timeline row spanning the same combined width below. The project rail and Lux panel span the editor height. Secondary controls scroll inside their panels. Smaller windows retain the existing stacked layout. This structural change has not been visually accepted against the reference; browser screenshot verification remains required.

The desktop target is a 1440 × 900 dark navy editor. Its surface hierarchy is: brand/header; module navigation; left workspace rail; central canvas/viewport; inspector; palette/timeline; one assistant panel. Narrow layouts collapse secondary panels rather than creating page overflow. Exact visual comparison needs the production corporate logo asset, licensed imagery and a browser regression baseline; absent assets must not be substituted with fabricated equivalents.


