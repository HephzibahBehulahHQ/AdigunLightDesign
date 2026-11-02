# Development

The required goal also includes the [live co-pilot extension](LIVE_COPILOT_REQUIREMENTS.md).
It preserves the master specification and desktop visual target. Its acceptance
gates are additional work, not completed by the existing request-based Lux UI.
The [floating Bot window](FLOATING_BOT_REQUIREMENTS.md) is also required by the
latest user extension. Backend progress is tracked in [Supabase setup](SUPABASE_SETUP.md).
The [top-right menu extension](TOP_MENU_REQUIREMENTS.md) additionally requires
compact spaced icons, authentic login status and desktop/mobile overlap checks.

The offline-capable domain core remains native ES modules. Production assets are
now bundled by pinned Vite, with a pinned Supabase browser client for optional
account handling. Node 24 or later is required. Commit the lockfile; use `npm ci
--ignore-scripts` before validation. Dependency caches and node_modules are excluded.

```text
npm test          # domain and project-contract tests
npm run check     # product structure and static-safety checks
npm run build     # create deployable static assets in dist/
```

Do not add an integration because a button needs a destination. First add the domain contract, then an adapter, tests and an explicit availability state. Keep local user projects in a versioned format. A cloud service requires an authenticated server-side authorization model before it can be enabled.

Auth is unavailable unless the build receives `ALD_SUPABASE_PUBLISHABLE_KEY`.
Only the `sb_publishable_` key type is accepted; never set this to a secret or
service-role key. Do not commit any key or credential. Password sessions stay in
memory, and reload returns to guest. This build configuration is not deployment.

