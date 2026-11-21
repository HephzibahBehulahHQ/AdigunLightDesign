# AdigunLightDesign

AdigunLightDesign is the unified color and lighting design studio from **Hephzibah Behulah → HB Elektroniker**.

The browser studio brings palette design, artistic lighting previsualization, virtual DMX, cue authoring, and exports together in one versioned project document. After the first online visit caches the release, the studio can reopen local projects offline.

## Status

[Open the live studio](https://adigunlightdesign.hephzibahbehulah.com/). The public landing page runs an interactive 3D preview and offers studio recordings and editable lighting samples. See [delivery evidence and open gates](docs/DELIVERY_PROGRESS.md) for the current release and [milestone acceptance](docs/MILESTONES.md) for the full scope.

## Local development

Install the pinned dependencies, then build. The generated `dist/` is served by
a static web server; raw source now requires Vite bundling for the optional Auth SDK.

```text
npm ci --ignore-scripts
npm test
npm run check
npm run build
npm run verify:studio
```

The GitHub Pages release workflow builds `dist/` from `main` and verifies the deployed files against their checksums. The browser acceptance runner uses Playwright Chromium and the built `dist/` for its offline test.

## Documentation

- [M0 audit](docs/M0_AUDIT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)
- [Security](docs/SECURITY.md)
- [Internationalization](docs/I18N.md)
- [Color engine](docs/COLOR_ENGINE.md)
- [Lighting engine](docs/LIGHTING_ENGINE.md)
- [Virtual DMX](docs/DMX.md)
- [Cue timeline](docs/TIMELINE.md)
- [Export formats](docs/EXPORT_FORMATS.md)
- [Lux action contract](docs/AI_TOOLS.md)
- [Accessibility](docs/ACCESSIBILITY.md)

## Integration status

The public release supports Guest editing with local saves and downloads. Supabase account and cloud project adapters exist, with live authenticated verification pending. Lux has local suggestions and an optional service adapter, with live provider acceptance pending. Fixture output is virtual. Physical DMX, licensed GDTF catalog integration, and MVR interchange remain outside the verified release.

The build includes the verified corporate logo from the shared design-system repository.

