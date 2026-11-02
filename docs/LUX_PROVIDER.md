# Server-side Lux provider adapter

`server/openai-lux.js` is an optional Responses API adapter, outside the static browser build. It requires `OPENAI_API_KEY` and `LUX_OPENAI_MODEL` in the server environment, or explicit server-only configuration. No default model or account access is assumed. Never copy these credentials into browser files.

The adapter requests structured suggestion JSON, maps its encoded argument objects into the native tool envelope and rejects malformed, refused, incomplete or unsupported responses. It returns suggestions only: no project mutation, export download or physical output occurs. Domain action validation, previews and user confirmation remain separate requirements. Request/context/output sizes and a transport timeout are bounded. Provider errors do not expose response bodies or credentials.

Implementation references: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) and [Responses migration guide](https://developers.openai.com/api/docs/guides/migrate-to-responses). The request sets `store: false`; this setting is not a claim of zero retention across every provider data-control policy.

Mocked transport tests passed. No live provider request was made. There is no HTTP endpoint, deployed service, user authentication, rate limiting or browser connection yet. GitHub Pages cannot execute this server module. Lux chat must remain offline until those layers are configured and verified.
