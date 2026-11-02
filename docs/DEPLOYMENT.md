# Deployment

The repository includes a GitHub Actions validation workflow that runs the Node 24 test suite, project check and static build on pushes and pull requests. Push CI for `f22141df637b3d062408387005c5aa203dccdc4f` completed successfully in run `41530529751`. This is validation evidence, not deployment or visual acceptance.

The implementation branch incorporates main's custom-domain configuration from
`943e9df1d1cae22a1d267ef1c01f752409c6680c`. Both versions of CNAME name the same
hostname; the branch retains a trailing newline. Main's root-domain `_config.yml`
is preserved for the existing Jekyll landing page. This reconciliation does not
merge the draft application PR or deploy its editor. The static application build
uses `dist/CNAME`; Jekyll configuration is not required by its ES-module runtime.

The static build writes `dist/`. GitHub Pages is suitable for the current offline-first core after a Pages publishing workflow, base-path configuration and live verification are added. This repository has no configured cloud database, authentication provider, AI endpoint, physical-DMX bridge or production secret. These services require separate infrastructure and server-side environment variables; never place their credentials in static assets.
