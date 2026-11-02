# Lux action contract

The browser chat-session controller now holds service configuration in memory,
requires consent for each request, and prevents overlapping requests. Disconnect
or reconfiguration invalidates pending responses. Project edits during a request
discard its suggestions; later review also checks the original project snapshot.
Receiving suggestions never applies them. Mutation review uses the existing
native preview/confirmation boundary; read-only review uses the native evaluator.
These behaviors have mocked transport tests. The Lux panel now exposes optional
session-only URL/token configuration, disconnect, a question field, per-request
consent and suggestion review. Configuration does not claim a verified connection.
Each mutation opens a native before/after data preview for explicit confirmation;
read-only suggestions display their evaluated result. Editing the project makes
the remaining suggestions stale. Browser interaction, a live service and a live
provider connection remain unverified. Earlier offline descriptions below record
the baseline before this optional service UI was added.

Asset-based image extraction is now a native mutation handler. It accepts only an asset ID found in an injected local decoded-image store; it never fetches URLs or file paths. The user-selected image workflow retains up to five downsampled images in memory, with defensive pixel copies and metadata-only listing. Reloading loses this cache; the generated palette remains in native project data. Preview candidates retain exact extracted colors/IDs for later confirmation. This provides 14 mutation and two read-only native handlers across the 16 names, not an AI-provider integration. Image extraction is not yet exposed as a Lux panel action.

Read-only native handlers measure opaque HEX contrast and generate local text artifacts for `project-json`, `palette-json`, `css`, `palette-svg`, `design-tokens`, `patch-csv`, `cue-csv` and `canvas-svg`. They reuse the domain/export implementations and do not mutate the project, start downloads, send network requests or claim external-tool compatibility. Unsupported format names and missing palette/scene IDs reject. Image extraction is a separate confirmed mutation using the approved asset context described above. Provider/chat integration is still absent.

The local palette-lighting action is now available in the Lux panel, clearly labeled as local with no AI connection. It previews each affected fixture's before/after RGB color and requires Confirm & apply; Cancel leaves the document unchanged. Private preview candidates preserve exact generated IDs, reject stale projects and cannot be replaced by edited public preview data. Applying a preview records one undoable transaction and consumes the preview once. Domain tests cover these guarantees. This does not connect natural-language chat to a provider or establish browser interaction acceptance.

Six additional native handlers support palette creation, swatch editing/locking, harmony generation, palette-to-surface and palette-to-fixture application. Color edits respect locks. Palette-to-material uses a known room surface name (`accent`, `wall`, `floor`, `ceiling`) plus optional scene/swatch IDs; palette-to-lights distributes colors over all fixtures or an explicit fixture-ID selection. Palette creation accepts optional 1–256 HEX strings. The executor remains disconnected from Lux chat and any AI provider; these are tested local action capabilities, not an AI integration.

The local native executor supports 14 project-changing actions: the six palette actions above, approved-image extraction, add/update/patch fixture, create/update cue, create scene and add a 2D object. It requires an explicit confirmation flag, uses project transactions and validation, and returns an undoable state plus a local receipt. Invalid operations leave the source unchanged. Read-only tools use a separate executor. The palette-lighting action has local preview/confirmation UI; other handlers are not connected to chat. Provider authentication and server audit storage remain unimplemented. Prototype-inherited names are rejected by registry validation.

The browser contains a tested, non-executing registry for the 16 required Lux tool names. Every proposed call has the envelope `{ type: "adigunlightdesign.tool-call", version: 1, name, payload }`; unregistered names and malformed required fields are rejected. Read-only/export previews do not need mutation confirmation; project-changing proposals are marked as requiring it.

This is not an AI provider or backend. Lux remains offline because no authenticated server endpoint, provider credentials, user consent flow, rate limit or server-side audit store has been configured. The browser does not contain an API key and cannot execute generated JavaScript. Connecting an AI service requires a server-side adapter that validates this contract, provides an action diff, obtains explicit confirmation, invokes native project commands and records a receipt.
