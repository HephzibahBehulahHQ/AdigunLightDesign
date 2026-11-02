# Development

The required goal also includes the [live co-pilot extension](LIVE_COPILOT_REQUIREMENTS.md).
It preserves the master specification and desktop visual target. Its acceptance
gates are additional work, not completed by the existing request-based Lux UI.

The project is intentionally initialized as a static, offline-capable core with no downloaded runtime dependencies. Node 24 or later is required for validation.

```text
npm test          # domain and project-contract tests
npm run check     # product structure and static-safety checks
npm run build     # create deployable static assets in dist/
```

Do not add an integration because a button needs a destination. First add the domain contract, then an adapter, tests and an explicit availability state. Keep local user projects in a versioned format. A cloud service requires an authenticated server-side authorization model before it can be enabled.

