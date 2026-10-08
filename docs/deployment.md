# GitHub Pages deployment

Repository: [iLikeToLie/signal-atlas](https://github.com/iLikeToLie/signal-atlas). The app targets [GitHub Pages](https://iliketolie.github.io/signal-atlas/). Local imports remain in the browser and are excluded from the published catalogue.

The prepared [Pages workflow](../.github/workflows/pages.yml) follows [official custom-workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Pull requests build/test only. Publish manually through `workflow_dispatch`, or push an explicit release update to `public/version.json` on `release/v0.1.6`. Changes to the Pages workflow also deploy; changes to the Pages workflow also deploy; ordinary code pushes do not deploy. The visible app version comes from `package.json`; keep it aligned with `public/version.json`.

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

Visit `http://localhost:4173/signal-atlas/#/atlas?id=control-reference`. Public deployments expose bundled synthetic catalogue data. Local imports are never bundled.


[Back to the README](../README.md).
