# Deployment

The repository includes a GitHub Actions validation workflow that runs the Node 24 test suite, project check and static build on pushes and pull requests. Push CI for `f22141df637b3d062408387005c5aa203dccdc4f` completed successfully in run `41530529751`. This is validation evidence, not deployment or visual acceptance.

The implementation branch incorporates main's custom-domain configuration from
`943e9df1d1cae22a1d267ef1c01f752409c6680c`. Both versions of CNAME name the same
hostname; the branch retains a trailing newline. Main's root-domain `_config.yml`
is preserved for the existing Jekyll landing page. This reconciliation does not
merge the draft application PR or deploy its editor. The static application build
uses `dist/CNAME`; Jekyll configuration is not required by its ES-module runtime.

Vite builds relative asset URLs into `dist/` and copies the root CNAME. GitHub
Pages publication and live editor verification remain pending. Shared Supabase
product storage exists, but frontend Auth is unavailable in builds without
`ALD_SUPABASE_PUBLISHABLE_KEY`. This is a public client key, deliberately supplied
outside version control; secret/service-role keys are rejected. No production
credentials are committed. AI providers and physical-DMX bridges require separate
server infrastructure. No deployment is performed by the build or validation CI.

## Editor release workflow

The editor workflow is manual and runs from main. Before dispatching it,
review and merge the application PR through the repository's normal controls.
In Pages settings, select GitHub Actions as the publishing source and retain
the existing custom domain. Restrict the github-pages environment to main and
keep its required reviewers enabled where configured.

The build job runs typecheck, tests, the project contract check, and the static
build before uploading dist. The deployment job uses the github-pages
environment. The optional ALD_SUPABASE_PUBLISHABLE_KEY repository variable
enables the browser Auth client in the build.

After deployment, verify the custom-domain page loads the editor bundle from
the released build. Confirm sign-in only if a public client key was configured.
