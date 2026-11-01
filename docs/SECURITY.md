# Security boundary

- Project imports must validate MIME, size and schema before use.
- AI providers are optional server-side integrations. Browser bundles contain no secret key.
- Lux actions are structured, capability-scoped, validated and confirmable; they may never execute arbitrary JavaScript.
- Cloud projects require authenticated owner-scoped access and server-enforced authorization.
- External lighting output is disabled by default. A future Art-Net/sACN bridge must require deliberate activation, device/network permission and an emergency blackout path.
- Fixture definitions, manuals, embedded asset metadata and imported files are untrusted input.

