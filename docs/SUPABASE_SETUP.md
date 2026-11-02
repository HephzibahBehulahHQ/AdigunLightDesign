# Shared Supabase backend

The user selected shared project **HephzibahBehulahHQ**, ref
`fqcbfnktdvqojyezxeis`, API URL
`https://fqcbfnktdvqojyezxeis.supabase.co`, on 2 November 2026.
Canonical frontend: https://adigunlightdesign.hephzibahbehulah.com/.

Product storage was created only in `adigunlightdesign`: `projects` with owner
foreign key, bounded schema-v1 JSON document, revision and timestamps. Five RLS
policies combine owner-scoped CRUD with a restrictive registered-user gate;
anonymous Auth sessions are excluded even though they use the authenticated DB
role. Anonymous API privileges are revoked. An invoker trigger preserves row
identity/ownership and creation time, increments revision and stamps updates.
The reviewed SQL contract is `docs/sql/cloud-project-storage.sql`. Hosted
migrations: `adigunlightdesign_cloud_project_storage` and
`adigunlightdesign_require_registered_project_owner`.

Database metadata verified RLS, policies, role grants and the invoker trigger.
No project rows are retained. Shared-project advisors returned warnings
including anonymous-access findings; the registered-user gate was added after
that check. Other products' policies/settings were not changed. Advisor output
alone is not proof of cross-user isolation; see the
[Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

A subsequent advisor check still reports an anonymous-access warning for this
table, with a policy list that differs from current `pg_policies` metadata.
The discrepancy remains unresolved; do not report a clean security audit.
Current metadata shows five policies including the restrictive registered-owner
gate, RLS enabled, no anonymous SELECT grant and an invoker trigger. Review the
[anonymous-access advisory](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins)
and verify actual authenticated/anonymous requests before enabling cloud features.

## Transaction-scoped database verification

`docs/sql/verify-cloud-project-rls.sql` was executed successfully against this
project on 2 November 2026. It internally selected two existing registered owner
IDs without returning identities, inserted two temporary product-only projects,
then emulated database roles and JWT claims. Assertions verified anonymous-role
denial; owner read access; cross-owner read/update/delete denial; forged-owner
insert denial; owner identity preservation and server revision increment; and
anonymous Auth-session read/insert denial. All test writes were rolled back.
The result reported `database_role_verification: passed` and zero retained test
projects. A separate query confirmed zero stored projects and the same count of
two registered users; no Auth records were created or changed.

These are real PostgreSQL policy/trigger tests using emulated claims. They do
not validate signed JWT issuance, browser login, PostgREST schema exposure or two
independent real API sessions. The advisor discrepancy remains unresolved and
must not be reported as a clean security audit.

## Optional browser account flow

Pinned `@supabase/supabase-js` now provides existing-account password sign-in,
server-side `getUser` verification, Auth-event handling and session-local sign-out.
The header uses only verified, non-anonymous user state. Tokens are held in memory;
URL session detection and persistent sessions are disabled. Reload returns to
guest. Signing out uses local scope to preserve other sessions in this shared
project. The window's local layout keys also use the verified account ID.

The Vite build requires an externally supplied `ALD_SUPABASE_PUBLISHABLE_KEY` to
enable this flow. The default build remains unconfigured; no actual key,
password or token is committed. SDK and dialog tests use mocks and synthetic
credentials. No live login, sign-up, email callback or cloud saving is established.
Validation: the full local suite passed 212 tests with zero failures/skips.
Focused checks cover registered/anonymous identity handling, stale verification,
session-local sign-out, failed sign-out, password clearing and secret-shaped
build-key rejection. The dependency audit reported zero vulnerabilities. The
unconfigured production build passed with relative assets, canonical URL and
CNAME retained, and server sources excluded. These are not live Auth results.
References: [password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword),
[verified user lookup](https://supabase.com/docs/reference/javascript/auth-getuser),
[session-local sign-out](https://supabase.com/docs/reference/javascript/auth-signout).

Not complete: exposing the product schema through the Data API, live frontend Auth verification,
product redirect allowlisting, manual cloud save/load, real-session API isolation,
authenticated Bot acceptance and account layout persistence. Existing global
Site URL and other products' schemas remain intact. Public client configuration
must use a publishable key; private/service-role keys must never enter the app.
