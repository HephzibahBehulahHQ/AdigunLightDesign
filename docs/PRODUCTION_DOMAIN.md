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

Supabase is not connected to this application yet. Accessible projects were
VoltPRo and HephzibahBehulahHQ; neither has been established as this product's
backend. Do not change their authentication configuration without confirming
the intended project. When provisioned, configure the frontend hostname as the
Auth Site URL and allow only the actual implemented callback paths. This does
not require a custom Supabase API domain. Never include private keys in this
static build.
