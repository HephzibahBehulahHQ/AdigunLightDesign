# Production domain

Canonical frontend: https://adigunlightdesign.hephzibahbehulah.com/

On 2 November 2026, public DNS returned a CNAME to
`hephzibahbehulahhq.github.io` and HTTPS returned HTTP 200 from GitHub.com.
This verifies public routing and HTTPS, not Cloudflare account settings or
deployment of the current implementation branch.

The repository CNAME and static build preserve this hostname. The page declares
the canonical URL. GitHub Pages custom-domain and HTTPS enforcement settings
still require account-level verification; no DNS change is necessary based on
the observed public record.

The user selected shared Supabase project HephzibahBehulahHQ
(`fqcbfnktdvqojyezxeis`). Product storage is isolated in `adigunlightdesign`;
frontend Auth and cloud operations remain unconnected. See `SUPABASE_SETUP.md`.
Preserve the shared project's existing global Auth Site URL; add this product's
actual implemented callback paths to its redirect allowlist when that flow is
ready. A custom Supabase API domain is not required. Never include private keys
in this static build.
