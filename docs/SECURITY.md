# Security boundary

Project validation rejects duplicate/empty palette identities and cue target lists with missing or repeated fixture IDs. Swatch IDs may intentionally repeat across saved palette versions. These rules prevent ambiguous ID-based mutations and first-match cue evaluation; they run on native import and editor transactions.

Imported fixture/swatch identifiers and names are escaped before insertion into option values, data attributes or text markup. Shared markup helpers have injection-string regression tests. Palette seed preferences normalize before rendering. This closes the identified identifier attribute-injection paths; it does not establish a complete browser security audit or CSP verification.

- Project imports must validate MIME, size and schema before use.
- AI providers are optional server-side integrations. Browser bundles contain no secret key.
- Lux actions are structured, capability-scoped, validated and confirmable; they may never execute arbitrary JavaScript.
- Cloud projects require authenticated owner-scoped access and server-enforced authorization.
- External lighting output is disabled by default. A future Art-Net/sACN bridge must require deliberate activation, device/network permission and an emergency blackout path.
- Fixture definitions, manuals, embedded asset metadata and imported files are untrusted input.

