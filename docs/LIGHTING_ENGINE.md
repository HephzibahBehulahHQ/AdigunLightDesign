# Lighting engine

M3 adds a native WebGL scene preview with a floor, room walls, simple architectural geometry, camera orbit and palette-to-material mapping. It is a browser GPU renderer, but not calibrated photometry: it does not report lux, candela or fixture certification.

The preview accepts pointer orbit and has an explicit camera reset. Applying a selected palette swatch changes a persisted scene material. Fixtures, virtual DMX, cue playback, shadows and physical hardware output remain outside M3.
