# Server-side Lux provider adapter

The Lux settings panel accepts an explicit HTTPS endpoint (or loopback HTTP
`/api/lux`) and a service token held in browser memory. Each request requires
consent. The transport omits ambient cookies, rejects redirects and validates
suggestion envelopes. `buildLuxProjectContext` provides bounded palette,
fixture, scene and cue summaries with total counts. It excludes images,
history, credentials, descriptions and canvas artwork. Disconnecting,
reconfiguring the service or replacing the workspace aborts the browser
request and discards stale replies. Any work already started by the remote
provider is managed by that provider.

## Running the optional API host

Use Node 24 or newer and run `npm run serve:lux` after configuring server environment variables:

- `OPENAI_API_KEY`: provider key, kept server-side.
- `LUX_OPENAI_MODEL`: an explicitly selected model supported by the account and structured-output API.
- `LUX_SERVICE_TOKEN`: at least 32 characters for the single-user service-token authenticator.
- `LUX_ALLOWED_ORIGINS`: comma-separated exact editor origins, without paths or trailing slashes.
- Optional `LUX_PORT` (default 8787) and `LUX_BIND_HOST` (default 127.0.0.1).

The host serves the API only, not application files or server source. It bounds header size and configures HTTP timeouts. Audit metadata is written to stdout without prompts or project context; operational log persistence is the host's responsibility. Default binding is loopback. External hosting requires a configured deployment and TLS proxy. This single-user token mode is not production multi-user authentication. No service is started automatically by the static build.

`server/lux-endpoint.js` provides a Web Request/Response handler for POST `/api/lux`. It denies requests without an injected authenticated user, checks exact allowed origins, requires per-request provider consent, limits JSON bodies to 64 KiB and applies bounded in-memory per-user rate limits. It returns suggestions only and never executes project actions. An optional audit callback receives request/user/tool metadata without prompts or project context. In-process and loopback HTTP tests passed with a mocked provider; production deployment remains unverified.

`bearerAuthenticator` is a constant-time comparison helper for a configured service token of at least 32 characters. It identifies one configured service user and is not a replacement for production multi-user identity. A production host must inject real session/identity validation and persistent audit storage. The endpoint defaults to denying authentication and returning unconfigured-provider errors rather than pretending AI is online.

`server/openai-lux.js` is an optional Responses API adapter, outside the static browser build. It requires `OPENAI_API_KEY` and `LUX_OPENAI_MODEL` in the server environment, or explicit server-only configuration. No default model or account access is assumed. Never copy these credentials into browser files.

The adapter requests structured suggestion JSON, maps its encoded argument objects into the native tool envelope and rejects malformed, refused, incomplete or unsupported responses. It returns suggestions only: no project mutation, export download or physical output occurs. Domain action validation, previews and user confirmation remain separate requirements. Request/context/output sizes and a transport timeout are bounded. Provider errors do not expose response bodies or credentials.

Implementation references: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) and [Responses migration guide](https://developers.openai.com/api/docs/guides/migrate-to-responses). The request sets `store: false`; this setting is not a claim of zero retention across every provider data-control policy.

Client, endpoint and loopback host tests cover the service contracts.
Chrome verifies browser cancellation against a loopback HTTP probe.
Live provider and production identity, persistent audit, and server
deployment acceptance remain open. GitHub Pages serves the browser UI.
