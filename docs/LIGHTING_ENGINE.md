# Lighting engine

M3 adds a native WebGL scene preview with a floor, room walls, simple architectural geometry, camera orbit and palette-to-material mapping. It is a browser GPU renderer, but not calibrated photometry: it does not report lux, candela or fixture certification.

The preview accepts pointer orbit and has an explicit camera reset. Applying a selected palette swatch changes a persisted scene material. Generic virtual fixtures produce an artistic housing, beam and surface-spill preview; this does not validate manufacturer geometry, DMX behavior or calibrated output. Beam cone tessellation follows the preview-quality setting: 12 segments for Performance, 24 for Balanced and 40 for Quality. Virtual DMX editing and cue playback are M4/M5 capabilities. Soft prop contact shading is also an artistic preview effect, not a physical shadow calculation. Physical hardware output remains outside the editor's verified scope.



Room scene templates create distinct Library, Kitchen, Bathroom, Toilet, Garage, Hallway, Swimming Pool, Disco/Party and Clubhouse interiors alongside the existing Living Room. Each scene saves its room dimensions, surface colors, room type and ambient fill. Cue lanes are scoped to their owning scene, so room cue names, timing, track schedules, playback and edits remain independent. Cues from older project files without a `sceneId` continue to belong to the first scene. The WebGL preview uses procedural room details and an artistic ambient tint; these templates are visual starting points, not photometric or architectural specifications. Fixture identities and DMX patches remain project-wide in this milestone.
