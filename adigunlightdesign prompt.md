# ADIGUNLIGHTDESIGN
## MASTER CODEX AGENT IMPLEMENTATION SPECIFICATION
Version 1.0 | November 2026

### 0. YOUR ROLE AND MANDATE

Act as a coordinated senior engineering team consisting of:

- Principal Software Architect
- Senior React/TypeScript Engineer
- Professional UI/UX and Design Systems Engineer
- Color Science Engineer
- 3D Graphics and Lighting Simulation Engineer
- DMX512 and Entertainment Lighting Systems Engineer
- AI Agent and Tool-Calling Engineer
- Accessibility and Internationalization Engineer
- Quality Assurance and Security Engineer
- DevOps and Technical Documentation Engineer

Your mission is to design, implement, test, document, and deliver **AdigunLightDesign**, a professional browser-based, AI-assisted color and lighting design application.

This is a real software product, not a demonstration website, static dashboard, UI prototype, or collection of nonfunctional components.

Do not represent a feature as complete unless its real functionality has been implemented and verified.

Do not promise zero bugs. Establish measurable quality gates, automated tests, reproducible builds, and clear defect reporting.

### 1. OFFICIAL REPOSITORIES AND SOURCE OF TRUTH

**Product repository:**
https://github.com/HephzibahBehulahHQ/AdigunLightDesign

**Corporate repository:**
https://github.com/HephzibahBehulahHQ/HephzibahBehulahHQ.github.io

**Master design system:**
https://github.com/HephzibahBehulahHQ/hb-design-system

**Division repository:**
https://github.com/HephzibahBehulahHQ/hb-elektroniker

Before writing production code:

1. Inspect all four repositories and their existing files.
2. Read all applicable `AGENTS.md` files.
3. Read the design-system README, tokens, templates, component specifications, and available brand assets.
4. Inspect the product repository's current branches, code, dependencies, and workflows.
5. Identify actual implemented components versus planned components.
6. Preserve all existing functioning code and user work.
7. Create a feature branch and baseline verification report before making substantial changes.
8. Establish the current build, test, and deployment status.
9. Document missing resources, dependencies, credentials, and integration blockers.
10. Use verified repository contents as the authority for corporate branding.

Never assume that a component, package, logo, or template exists merely because it appears in documentation.

Never modify the corporate or division repositories as a shortcut for implementing product features.

### 2. PRODUCT IDENTITY

Product name: AdigunLightDesign

Parent company: Hephzibah Behulah

Division: HB Elektroniker

Product category: Unified Color and Light Design Studio

Product tagline: Design Color. Shape Light. Create Atmosphere.

Brand hierarchy:

Hephzibah Behulah → HB Elektroniker → AdigunLightDesign

Use one approved corporate logo in the application header.

Display the HB Elektroniker division identity and the AdigunLightDesign product wordmark without inventing additional corporate logos.

Use the official design system for typography, spacing, icons, shadows, borders, responsive behavior, and themes.

Verified brand foundation:

- Midnight Navy: #0B1220
- Royal Blue: #2563EB
- Metallic Gold: #D4AF37
- Ivory White: #F8FAFC
- HB Elektroniker Electric Cyan: #22D3EE

Treat these as brand tokens, not a restriction on user-generated palette colors or lighting effects.

Support light and dark themes.

All colors must meet applicable accessibility requirements.

Do not use generic placeholder branding.

### 3. PRODUCT VISION

AdigunLightDesign must unify professional color design and lighting previsualization in a coherent workspace.

Users must be able to:

1. Create and edit color palettes.
2. Generate harmonies using real color-science calculations.
3. Extract palettes from imported images.
4. Analyze color contrast and gamut compatibility.
5. Build and edit 3D rooms, stages, and lighting environments.
6. Place and configure virtual lighting fixtures.
7. Apply palettes to materials and lights.
8. Create DMX patches and lighting cues.
9. Simulate cue playback.
10. Use a context-aware AI copilot to manipulate the project through validated tools.
11. Save, reopen, version, and export projects.
12. Work in English, German, Yoruba, and Nigerian Pidgin.
13. Produce useful deliverables for real design and lighting workflows.

A palette and its corresponding lighting scene must be connected through a shared project data model.

### 4. PRIMARY APPLICATION NAVIGATION

Build these top-level modules:

**A. Create Canvas**
- Unified infinite 2D workspace
- Palette and moodboard objects
- Lighting scene references
- Layers and grouping
- Drag, resize, rotate, duplicate, lock, and delete
- Snap-to-grid and alignment guides
- Undo/redo and project history
- 2D, 3D, and split-view controls

**B. Palette Engine**
- Manual color editor
- Harmony generator
- Image color extraction
- Palette locking and rerolling
- Color conversions
- Contrast validation
- Material preview
- Palette comparison and export

**C. Light Lab**
- 3D scene builder
- Fixture placement
- Fixture profile inspector
- DMX patch editor
- Cue and effect timeline
- Live simulation mixer
- Lighting visualization

**D. AI Copilot**
- Floating Adigun BOT interface
- Product-aware Lux lighting assistant
- Natural-language commands
- Structured tool execution
- Image analysis
- Optional voice input
- Action history and undo

**E. Libraries & Assets**
- Saved palettes
- Scene templates
- Fixture profiles
- Materials and textures
- Imported assets
- User collections

**F. Export & Integrate**
- CSS and design tokens
- SVG and raster images
- Palette interchange formats
- Project JSON
- Cue sheets and PDF reports
- Supported lighting interchange formats
- Optional third-party integrations

**G. Community & Inspiration**
- Curated starter templates
- Local saved recipes
- Import/export sharing
- Community publishing only when a real backend and moderation system exist

**H. Settings & Workspace**
- Language
- Theme
- Color-space preferences
- Rendering quality
- Accessibility
- Keyboard shortcuts
- Privacy
- AI provider settings
- Data and storage management

### 5. DESKTOP USER INTERFACE

Design for a primary desktop viewport of 1440 × 900 or larger, while supporting smaller laptops and tablets.

**Header**

Include:
- Corporate logo
- HB Elektroniker identity
- AdigunLightDesign wordmark
- Main navigation
- Current project name
- Save status
- Undo/redo
- Language selector
- Theme selector
- Settings
- Account controls only when authentication is implemented

**Left sidebar**

Include:
- Select
- Hand/pan
- Palette brush
- Color picker
- Fixture placement
- Material painter
- Shapes
- Text
- Measurement
- Orbit camera
- AI pin
- Layers
- Object search

**Central workspace**

Include:
- Infinite canvas
- Zoom and pan
- Grid
- 2D palette view
- 3D lighting viewport
- Split view
- Object selection
- Transform gizmos
- Drag-and-drop assets
- Camera controls
- Preview quality controls

**Right inspector**

Context-sensitive properties for:
- Palette colors
- Selected swatches
- Materials
- Lights
- Fixtures
- DMX addresses
- Cue settings
- Selected scene objects

**Bottom workspace**

Include:
- Cue timeline
- Transport controls
- Playback time
- Cue blocks
- Keyframes
- Tracks
- Fade durations
- Patch summary
- Expand/collapse behavior

**Floating AI assistant**

Use the corporate Adigun BOT convention.

Present the specialized lighting copilot as Lux within the bot experience.

Avoid competing floating chat widgets.

**Footer**

Use the official corporate footer convention where appropriate, including legal links and approved social accounts.

A compact application status bar may replace a full marketing footer in the editor, provided corporate attribution and legal access remain available.

### 6. PALETTE ENGINE: REQUIRED FUNCTIONALITY

Implement a deterministic, testable color engine.

**Color spaces**
- HEX
- RGB and RGBA
- HSL and HSV
- CIELAB and LCH
- OKLab and OKLCH
- sRGB
- Display-P3 where browser support and conversion logic permit

**Harmony algorithms**
- Complementary
- Split-complementary
- Analogous
- Triadic
- Tetradic
- Monochromatic
- Square
- Custom hue spacing
- Perceptual lightness scales
- Warm/cool variations

**Editing**
- Add and remove colors
- Drag to reorder
- Lock colors
- Reroll unlocked colors
- Copy values
- Adjust lightness, chroma, hue, and opacity
- Rename colors
- Save palette versions
- Compare two palettes
- Revert changes

**Generation**
- Seed color
- Text-described mood
- Image upload
- Dominant-color extraction
- Color sampling
- Optional AI suggestions

Use real deterministic harmony algorithms for the basic generator.

AI is an enhancement, not a dependency for fundamental palette operations.

**Accessibility**
- WCAG contrast calculation
- Normal and large-text checks
- Clear AA/AAA results
- Contrast improvement suggestions
- Out-of-gamut warnings
- Color-vision deficiency previews where technically validated

Never claim that a palette is universally accessible merely because one pair of colors passes a contrast threshold.

**Material previews**
- Matte paint
- Gloss paint
- Fabric
- Wood
- Metal
- Glass
- Concrete
- Plastic

Material previews must use real rendering properties or clearly labeled approximations.

### 7. 3D LIGHT LAB

Use a real 3D rendering engine.

Required scene primitives:
- Floor
- Walls
- Ceiling
- Room dimensions
- Stage platform
- Truss
- Furniture or props
- Cameras
- Light fixtures
- Materials

Required light categories:
- Ambient
- Directional
- Point
- Spot
- Area-light approximation where supported
- LED strip
- Wash
- Beam
- Moving head
- Practical lamp
- Architectural fixture
- RGB/RGBW fixture

**Lighting properties**
- Position
- Rotation
- Target
- Intensity
- Beam angle
- Color
- Color temperature
- Falloff
- Shadow behavior
- Gobo where implemented
- Pan and tilt
- Dimming
- Fixture mode

Support orbit, pan, zoom, camera presets, selection, grouping, and transforms.

Use physically motivated rendering settings where feasible.

Distinguish artistic previsualization from certified photometric analysis.

Do not claim precise lux, candela, illuminance, or photometric accuracy without calibrated fixture data and validated calculations.

Support performance tiers and automatic fallback on lower-powered devices.

### 8. FIXTURE LIBRARY

Build a structured fixture database.

Categories:
- Moving-head spot
- Moving-head wash
- Beam
- Profile
- Fresnel
- PAR
- LED PAR
- LED bar
- Pixel bar
- LED strip
- Blinder
- Strobe
- Followspot
- Architectural wash
- RGB floodlight
- RGBW floodlight
- Tunable-white fixture
- Dimmer
- Relay/switch pack
- Hazer/fog representation
- Laser representation, subject to safety restrictions
- Generic multi-channel fixtures

Every fixture profile must contain, as applicable:
- Manufacturer
- Model
- Fixture type
- Supported mode
- Channel count
- Channel functions
- DMX ranges
- Default values
- Pan/tilt limits
- Color capabilities
- Beam properties
- Physical dimensions
- Profile provenance
- License
- Validation status

Provide a useful verified starter library.

Support licensed GDTF imports and progressively expand the catalog.

Do not manufacture 20,000 fake fixture records.

Do not mark imported profiles as validated until schema, channel mapping, and sample behavior have been tested.

### 9. DMX512 ENGINE

Implement a correct internal DMX data model.

Requirements:
- Universes
- Channels 1–512 per universe
- Fixture addressing
- Mode selection
- Channel allocation
- Overlap detection
- Patch grid
- Fixture groups
- Channel value editor
- 8-bit and supported 16-bit channel handling
- Fixture personality mapping
- Dimmer curves where supported
- Cue snapshots
- Fade and timing interpolation
- Blackout
- Grand master
- Playback controls

Maintain a separation between:
1. Internal simulated DMX state
2. Visualized fixture behavior
3. External hardware output

The first two must work without hardware.

For hardware output, evaluate Art-Net, sACN/E1.31, and compatible gateways.

Implement an explicit connection layer rather than claiming browser-native DMX hardware support.

External output must require deliberate user activation, correct network permissions, supported hardware, and appropriate runtime infrastructure.

Provide a safe offline simulation mode by default.

Include emergency blackout behavior, output disable controls, and visible live-output status.

Never claim that a visualized fixture has been physically tested unless hardware testing occurred.

### 10. CUE TIMELINE AND EFFECTS

Provide:
- Multiple tracks
- Cue creation
- Cue duplication
- Cue reordering
- Cue names
- Cue durations
- Fade-in/fade-out
- Delay
- Hold
- Keyframes
- Playback
- Pause
- Stop
- Loop
- Scrubbing
- Scene snapshots
- Fixture groups
- Color transitions
- Dimmer chases
- Pan/tilt sequences
- Effect presets

Use deterministic interpolation for numerical fixture properties.

Store cue data independently of 3D rendering.

Changing a fixture parameter must update the viewport and relevant inspector controls consistently.

Prevent conflicting ownership of the same state between the timeline, mixer, and inspector.

### 11. ADIGUN BOT / LUX AI COPILOT

Integrate the approved corporate Adigun BOT interface.

Within AdigunLightDesign, the specialist copilot is named Lux.

Lux must understand the active project, selection, palettes, fixtures, scene, and cues through controlled project context.

**Input modes**
- Text
- Uploaded image
- Voice, where supported and authorized

**Example commands**
- Generate a five-color warm interior palette.
- Lock the navy swatch and regenerate the other colors.
- Check contrast between the background and accent.
- Create a room measuring 6 × 4 × 3 meters.
- Add three RGB wash fixtures.
- Set the fixtures to 2700K.
- Create a 10-second fade.
- Add a complementary lighting look.
- Explain the DMX patch.
- Export the palette as CSS variables.

**Required tool registry**
- create_palette
- update_swatch
- lock_swatch
- generate_harmony
- check_contrast
- extract_image_palette
- create_scene
- add_object
- add_fixture
- update_fixture
- patch_fixture
- create_cue
- update_cue
- apply_palette_to_material
- apply_palette_to_lights
- export_project

All AI operations must use validated structured arguments.

The assistant must not execute arbitrary generated JavaScript.

Show an action preview before high-impact or destructive operations.

Return action receipts with success/failure details.

Support undo for reversible changes.

Maintain a project-scoped audit history.

Keep API keys on a secure backend, never inside public frontend bundles.

Provide a clear unavailable/offline state when an AI provider is not configured.

AI-generated fixture settings must be validated against actual fixture capabilities.

Never allow AI to activate physical lighting output without explicit user confirmation.

### 12. INTERNATIONALIZATION

Four languages are mandatory:

- English: en
- German: de
- Yoruba: yo
- Nigerian Pidgin: pcm

Localize:
- Navigation
- Buttons
- Forms
- Settings
- Dialogs
- Tooltips
- Errors
- Empty states
- Notifications
- Help content
- Onboarding
- Export labels where appropriate
- AI responses

Use centralized locale resource files.

Do not scatter hard-coded English strings throughout components.

Persist the user's language preference.

Support runtime language switching without reloading or losing project state.

Preserve technical standards, units, fixture identifiers, and DMX terminology where translation would reduce correctness.

Use reviewed terminology for Yoruba and Nigerian Pidgin.

Do not invent localized engineering terminology when established English technical terms are more understandable.

Support locale-aware number formatting.

Provide clear fallbacks for missing translations during development, but do not classify a locale as complete until required strings are reviewed.

### 13. EXPORT AND INTEROPERABILITY

**Core exports**
- Native project JSON
- Palette JSON
- CSS variables
- Design-token JSON
- SVG
- PNG
- JPEG
- PDF palette sheets
- PDF cue sheets
- Fixture patch CSV
- Cue list CSV

**Advanced exports**
- Tailwind-compatible color tokens
- Adobe Swatch Exchange (ASE)
- Supported Procreate palette formats
- glTF/GLB scene export where feasible
- GDTF profile import
- MVR import/export where validated

**Separate integration projects**
- Figma plugin
- Adobe UXP integration
- Console interoperability
- Collaboration service
- Cloud project storage

Do not claim one-click Figma integration until a real plugin has been implemented, installed, and tested.

Do not claim universal MVR compatibility merely because a file can be generated.

Document which schema elements, fixture types, and external application versions have been tested.

### 14. TECHNOLOGY ARCHITECTURE

Recommended stack, subject to repository audit:

Frontend:
- React
- TypeScript
- Vite
- React Router
- Zustand
- React Three Fiber / Three.js
- Culori
- React i18next
- Accessible component primitives

Testing:
- Vitest
- React Testing Library
- Playwright
- axe-core
- ESLint
- TypeScript strict mode

Backend, when required:
- Node.js with a typed HTTP framework
- PostgreSQL
- Authenticated REST/WebSocket endpoints
- Background export jobs
- Secure AI provider integration

Use an architecture that can deploy a useful offline-first frontend independently of the optional backend.

Recommended project structure:

src/
- app/
- components/
- design-system/
- features/
  - canvas/
  - palette/
  - light-lab/
  - fixtures/
  - dmx/
  - timeline/
  - ai-copilot/
  - libraries/
  - export/
- domain/
- services/
- stores/
- i18n/
- hooks/
- utils/
- tests/

Additional directories:
- public/
- docs/
- scripts/
- fixtures/
- examples/
- e2e/
- .github/workflows/

Organize features by domain rather than creating oversized components.

### 15. PROJECT DATA MODEL

Define a versioned native project format.

Minimum entities:

Project:
- id
- schemaVersion
- name
- description
- createdAt
- updatedAt
- preferences
- palettes
- scenes
- fixtures
- patches
- cues
- assets
- history

Palette:
- id
- name
- colors
- harmonyType
- lockedSwatches
- metadata

Scene:
- id
- name
- objects
- materials
- lights
- cameras
- environment

Fixture:
- id
- profileId
- modeId
- transform
- properties
- patchAssignment

PatchAssignment:
- fixtureId
- universe
- startAddress
- channelFootprint

Cue:
- id
- name
- duration
- fade
- delay
- targets
- keyframes

Include schema validation, migrations, serialization tests, and backwards compatibility policies.

Never silently discard unsupported imported data.

### 16. STATE MANAGEMENT AND UNDO/REDO

Maintain one authoritative project document.

Use explicit commands and reversible transactions for editing operations.

Requirements:
- Undo/redo
- Save checkpoints
- Autosave
- Dirty-state tracking
- Project recovery
- Import validation
- Conflict detection
- Version migration

AI edits and human edits must pass through the same validated domain operations.

Do not build a full distributed event-sourcing infrastructure merely to support local undo.

Introduce persistent event logs or CRDT collaboration only when their additional complexity is justified and tested.

### 17. SECURITY AND PRIVACY

Mandatory:
- Strict input validation
- Safe file upload handling
- MIME and size checks
- Import schema validation
- Dependency vulnerability checks
- Content security policy
- Secret management
- Secure authentication where applicable
- Rate limits on AI endpoints
- Authorization for project resources
- No arbitrary code execution through AI tools
- No exposed API keys
- No silent uploads of user assets to third-party AI services

Treat imported fixture descriptions and external manuals as untrusted data.

Separate AI-generated instructions from authorized application commands.

Require user consent before transmitting private project content to external providers.

### 18. PERFORMANCE AND RESPONSIVENESS

Targets for representative supported desktop hardware:
- Responsive editor interactions
- Smooth pan and zoom
- Efficient object selection
- Lazy-loaded fixture assets
- Incremental scene updates
- Worker-based heavy calculations where beneficial
- GPU resource cleanup
- Reduced-motion support
- Graceful WebGL failure handling

Use 60 FPS as a performance objective for ordinary scenes, not a universal guarantee.

Create repeatable performance benchmarks using documented hardware, browser versions, and scene complexity.

Provide adjustable rendering quality:
- Low
- Medium
- High
- Ultra, when supported

Support narrow screens without clipped controls or horizontal page overflow.

On mobile, prioritize palette editing, project review, and simplified scene controls.

Do not promise desktop-grade 3D authoring on every phone.

### 19. TESTING AND ACCEPTANCE

**Unit tests**
- Color conversion
- Harmony calculations
- Contrast calculations
- DMX channel bounds
- Address overlap detection
- Cue interpolation
- Project serialization
- Undo/redo
- Locale switching

**Integration tests**
- Palette to material
- Fixture to scene
- Fixture to patch
- Patch to cue
- Cue to visualization
- AI tool to project mutation
- Export to re-import

**End-to-end tests**
- Create project
- Generate palette
- Lock and reroll
- Create scene
- Add fixtures
- Patch fixtures
- Create cues
- Play cues
- Save project
- Reopen project
- Export deliverables
- Switch all four languages

**Quality gates**
- TypeScript checks pass
- Lint passes
- Automated tests pass
- Production build succeeds
- No known critical or high-severity defects at release
- No broken primary navigation
- No fake success notifications
- No uncontrolled page overflow
- Keyboard-accessible primary controls
- Screen-reader labels on interactive elements
- Clear unsupported-feature states

Report actual test results, not intended results.

### 20. DELIVERY MILESTONES

**M0 — Audit and architecture**
- Repository inspection
- Existing-code preservation
- Architecture decisions
- Feature inventory
- Initial tests

**M1 — Design system and application shell**
- Branding
- Header and footer
- Navigation
- Responsive workspace
- Themes
- Four-language infrastructure

**M2 — Functional palette engine**
- Color science
- Harmony algorithms
- Image extraction
- Lock/reroll
- Contrast
- Save/export

**M3 — 3D scene editor**
- Geometry
- Cameras
- Materials
- Lighting
- Object transforms
- Palette-to-material mapping

**M4 — Fixtures and DMX simulation**
- Profile schema
- Fixture library
- Patch editor
- Channel validation
- Virtual DMX state

**M5 — Cue timeline**
- Timeline editing
- Keyframes
- Fade interpolation
- Playback
- Fixture visualization

**M6 — Lux AI copilot**
- Secure backend
- Tool registry
- Project context
- Action receipts
- Undo
- Optional image/voice support

**M7 — Export and interoperability**
- Native formats
- CSS and images
- PDF/CSV
- Verified advanced import/export adapters

**M8 — Hardening and release**
- Accessibility audit
- Localization review
- Performance tests
- Security review
- Documentation
- CI/CD
- Deployment

**M9 — Advanced roadmap**
- Physical DMX output bridge
- Extended fixture catalog
- Collaboration
- Figma plugin
- Community publishing
- Advanced photometric workflows

Do not treat estimated calendar durations as proof that complex milestones can be completed within a fixed number of days.

### 21. DEPLOYMENT

The product must be deployable from its own repository.

Support a static frontend deployment for offline-capable core features.

Use GitHub Actions for:
- Dependency installation
- Type checks
- Lint
- Tests
- Build
- Deployment

GitHub Pages may host the static frontend.

A secure AI backend, multiuser database, and network DMX gateway require separate supported infrastructure.

Never put private credentials into GitHub Pages or public repository assets.

Document all environment variables and deployment requirements.

### 22. DOCUMENTATION

Provide:
- README.md
- AGENTS.md
- ARCHITECTURE.md
- DEVELOPMENT.md
- TESTING.md
- DEPLOYMENT.md
- SECURITY.md
- I18N.md
- COLOR_ENGINE.md
- LIGHTING_ENGINE.md
- DMX.md
- AI_TOOLS.md
- EXPORT_FORMATS.md
- COMPATIBILITY.md
- CHANGELOG.md

Include:
- Installation
- Local development
- Test commands
- Production build
- Configuration
- Known limitations
- Browser compatibility
- Fixture data provenance
- Licensing
- Release procedures

### 23. CODEX EXECUTION DISCIPLINE

Work milestone by milestone.

For each milestone:

1. Inspect relevant existing files.
2. Identify the smallest coherent implementation.
3. Make changes in the product repository.
4. Add or update tests.
5. Run validation.
6. Fix failures.
7. Update documentation.
8. Commit logically.
9. Report evidence of completion.
10. Continue to the next approved milestone.

Avoid rewriting functioning code without justification.

Avoid unnecessary dependencies.

Do not produce thousands of placeholder records.

Do not fake backend endpoints.

Do not mark untested hardware integrations as complete.

Do not silently skip requested features.

When blocked, document the precise blocker and implement independent functionality that can still be completed safely.

### 24. MANDATORY PROGRESS REPORT

At the end of every execution phase, use:

STATUS

Done:
- Actual changes made
- Files or modules completed

Tested:
- Commands executed
- Passing tests
- Failed tests
- Build result

Blocked:
- Missing credentials, services, hardware, licenses, or unresolved defects

Next:
- One immediate next action

Keep updates concise. Do not repeat this entire specification in every response.

### 25. FINAL ACCEPTANCE

AdigunLightDesign is not considered delivered merely because its interface resembles the approved mockup.

Delivery requires demonstrable user workflows:

1. A user can create and save a real palette.
2. Harmony and contrast calculations produce validated results.
3. A user can create and manipulate a 3D scene.
4. Virtual fixtures affect the rendered scene.
5. DMX addresses and channel values are validated.
6. Cue playback changes the simulated fixture state.
7. Project data survives save and reload.
8. The four required languages work across completed modules.
9. Lux performs authorized project operations when configured.
10. Supported exports contain valid usable data.
11. Automated quality gates pass.
12. Unsupported external integrations are explicitly identified.

**FINAL INSTRUCTION**

Build AdigunLightDesign as a professional engineering-grade creative application that is reliable, modular, visually refined, maintainable, and extensible.

Respect the Hephzibah Behulah corporate design system and HB Elektroniker division identity.

Use the AdigunLightDesign repository as the source of truth for product implementation.

Begin with the repository audit and M0 architecture report. Then execute the milestones in order, verifying each completed feature before proceeding.

Do not stop at a beautiful mockup. Deliver functioning software with verifiable behavior.
