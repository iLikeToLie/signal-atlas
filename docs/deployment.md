# GitHub Pages deployment

Repository: [iLikeToLie/signal-atlas](https://github.com/iLikeToLie/signal-atlas). The app targets [GitHub Pages](https://iliketolie.github.io/signal-atlas/). Local imports remain in the browser and are excluded from the published catalogue.

The [Pages workflow](../.github/workflows/pages.yml) follows [official custom-workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Pull requests build/test only. Publish manually through `workflow_dispatch`, or push an explicit release update to `public/version.json` on the live branch, `feature/revised-inputs`. Changes to the Pages workflow also deploy; ordinary code pushes do not deploy. The visible app version comes from `package.json`; keep it aligned with `public/version.json`. Current release metadata is **0.1.8 / bidirectional-observation-comparisons**, with Git tag `v0.1.8`. Deployment verification checks version and revision. Publishing a Git tag alone does not deploy Pages.

An explicit `tag` in `public/version.json` must equal `v` plus the package version. After a successful build on `feature/revised-inputs`, the `tag-preview` job creates that annotated tag with a job-scoped `contents: write` token. An existing tag is accepted only if it already points to the same commit; it is never replaced. This also supports publication through the connected GitHub app when local Git transport credentials are unavailable. Remove the field for an untagged preview, or update it with the version for a newly authorized tagged preview.

1. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source.
2. Ensure the intended branch is permitted by the `github-pages` environment's deployment protection rules. The workflow uses the branch chosen when you run it; there is no hardcoded main/master assumption.
3. Once you intentionally commit/push the files, go to **Actions → Build and deploy Signal Atlas → Run workflow** and choose the intended branch. This action publishes the app.

The workflow uses `configure-pages`'s `base_path` output, uploads `dist`, and deploys with the required `pages: write`, `id-token: write`, environment and build dependency. Vite embeds assets/worker paths using `PAGES_BASE_PATH`. Hash navigation needs no server rewrites. Assets and the example download work on `/repository-name/`, root sites and local development. No secrets are required.

Project-path rehearsal:

```sh
# POSIX shell
PAGES_BASE_PATH=/signal-atlas/ pnpm build
PAGES_BASE_PATH=/signal-atlas/ pnpm preview
```

```powershell
$env:PAGES_BASE_PATH = '/signal-atlas/'
pnpm build
pnpm preview
```

Visit `http://localhost:4173/signal-atlas/` for the observation map and its inspector comparison view. Public deployments expose bundled synthetic examples. Retained recordings, reviewed descriptions and browser backups are never bundled. IndexedDB belongs to the hosting origin; changing host or port requires explicit backup/restore. Keep the separate pilot test database and ignored `artifacts/` out of deployment packages.

The prior release is `v0.1.7` (live commit `1081007168295f2c5e8d7f2323223636009af8f3`). If production verification fails, dispatch the Pages workflow against that tag to republish its validated artifact. This preserves branch history and browser data; do not reset or force-push the live branch. A later corrective release should use a new version/tag because existing release tags are immutable.


[Back to the README](../README.md).
