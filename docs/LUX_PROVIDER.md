# Server-side Lux provider adapter

`server/lux-endpoint.js` provides a Web Request/Response handler for POST `/api/lux`. It denies requests without an injected authenticated user, checks exact allowed origins, requires per-request provider consent, limits JSON bodies to 64 KiB and applies bounded in-memory per-user rate limits. It returns suggestions only and never executes project actions. An optional audit callback receives request/user/tool metadata without prompts or project context. Tests exercise the handler in process; no listening HTTP service or production deployment has been verified.

`bearerAuthenticator` is a constant-time comparison helper for a configured service token of at least 32 characters. It identifies one configured service user and is not a replacement for production multi-user identity. A production host must inject real session/identity validation and persistent audit storage. The endpoint defaults to denying authentication and returning unconfigured-provider errors rather than pretending AI is online.

`server/openai-lux.js` is an optional Responses API adapter, outside the static browser build. It requires `OPENAI_API_KEY` and `LUX_OPENAI_MODEL` in the server environment, or explicit server-only configuration. No default model or account access is assumed. Never copy these credentials into browser files.

The adapter requests structured suggestion JSON, maps its encoded argument objects into the native tool envelope and rejects malformed, refused, incomplete or unsupported responses. It returns suggestions only: no project mutation, export download or physical output occurs. Domain action validation, previews and user confirmation remain separate requirements. Request/context/output sizes and a transport timeout are bounded. Provider errors do not expose response bodies or credentials.

Implementation references: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) and [Responses migration guide](https://developers.openai.com/api/docs/guides/migrate-to-responses). The request sets `store: false`; this setting is not a claim of zero retention across every provider data-control policy.

Mocked transport and in-process endpoint tests passed. No live provider request was made. The endpoint handler is not yet hosted as a listening HTTP service. Production identity, persistent audit, deployment and browser connection remain unconfigured. GitHub Pages cannot execute these server modules. Lux chat must remain offline until the required service layers are configured and verified.
