# AdigunLightDesign

AdigunLightDesign is the unified color and lighting design studio from **Hephzibah Behulah → HB Elektroniker**.

It is being built as an offline-first browser application. It will connect palette design, lighting previsualization, virtual DMX, cue authoring, structured exports and an optional, securely hosted Lux copilot in one versioned project document.

## Status

Milestone 0 is documented. Partial implementations of the shell, palette engine, artistic 3D preview, virtual fixture/DMX engine, cue timeline and basic exports are available on the feature branch. This is not a completed M1–M5 acceptance claim: browser interaction, screenshot fidelity and remaining specification requirements still need implementation or verification. The product repository was empty before this work; no existing application has been replaced.

## Local development

Install the pinned dependencies, then build. The generated `dist/` is served by
a static web server; raw source now requires Vite bundling for the optional Auth SDK.

```text
npm ci --ignore-scripts
npm test
npm run check
npm run build
```

`npm run build` produces a static `dist/` folder. It is suitable for GitHub Pages once a Pages workflow is configured and verified.

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

## Honest integration status

The application currently has no AI provider, cloud database, authentication service, physical DMX bridge, licensed GDTF catalog, MVR adapter or deployment workflow. Those integrations will remain visibly unavailable until independently implemented and verified.

The official corporate logo source is maintained in the shared design-system repository. It will be referenced only from the verified asset path; no replacement or generated logo will be used.

