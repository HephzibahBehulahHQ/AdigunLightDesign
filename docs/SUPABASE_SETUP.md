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
No user project rows were inserted. Shared-project advisors returned warnings
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

Not complete: exposing the product schema through the Data API, frontend Auth,
product redirect allowlisting, manual cloud save/load, two-user isolation tests,
authenticated Bot acceptance and account layout persistence. Existing global
Site URL and other products' schemas remain intact. Public client configuration
must use a publishable key; private/service-role keys must never enter the app.
