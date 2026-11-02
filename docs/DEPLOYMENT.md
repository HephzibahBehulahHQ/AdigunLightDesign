# Deployment

The repository includes a GitHub Actions validation workflow that runs the Node 24 test suite, project check and static build on pushes and pull requests. It has not been observed running for this branch yet, so no remote CI result or deployment is claimed.

The static build writes `dist/`. GitHub Pages is suitable for the current offline-first core after a Pages publishing workflow, base-path configuration and live verification are added. This repository has no configured cloud database, authentication provider, AI endpoint, physical-DMX bridge or production secret. These services require separate infrastructure and server-side environment variables; never place their credentials in static assets.
