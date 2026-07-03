# Release Process

This project has two different release outputs:

- npm package publication to `diva.js`
- local archive creation in `release/`

The standard public release path is the GitHub Actions workflow that publishes to npm through npm Trusted Publishing.

## npm Release

### Prerequisites

- You have publish access to the `diva.js` package on npm.
- npm Trusted Publisher is configured for:
  - publisher: `GitHub Actions`
  - organization/user: `DDMAL`
  - repository: `diva.js`
  - workflow filename: `npm-publish.yml`
  - environment: `npm`
  - allowed action: `npm publish`
- The GitHub repository contains the workflow in `.github/workflows/npm-publish.yml`.
- `package.json` contains the canonical repository URL:

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/DDMAL/diva.js.git"
}
```

Without that field, npm provenance validation will fail.

### What the Workflow Does

The workflow is triggered by pushing a Git tag matching `v*`.

Current workflow:

- checks out the repository
- sets up Node.js 24
- installs dependencies with Yarn
- installs Elm globally
- runs `make build`
- runs `npm publish --provenance`

The publish job runs in the GitHub Actions environment named `npm`, which must match the environment configured in npm Trusted Publishing.

### Standard Release Steps

1. Make sure the worktree is in the state you want to release.
2. Update `package.json` with the new version.
3. Commit the version bump and any accompanying changes.
4. Build locally to confirm the package still compiles:

```sh
make build
```

5. Optionally inspect the package tarball contents before release:

```sh
npm pack --dry-run
```

6. Push the commit.
7. Create and push a version tag that matches the `package.json` version exactly:

```sh
git tag vX.Y.Z
git push origin vX.Y.Z
```

8. Watch the `Publish to NPM` workflow in GitHub Actions.
9. Confirm the new version appears on npm: `https://www.npmjs.com/package/diva.js`

## Package Contents

The npm package contents are controlled by the `files` field in `package.json`:

- `build/`
- `README.md`
- `LICENSE`

That means the published package includes:

- `build/diva.js`
- `build/diva.esm.js`
- `build/diva.debug.js`
- `README.md`
- `LICENSE`
- `package.json`

The debug build is intentionally published.

## Local Archives

If you want local release archives in addition to the npm package, run:

```sh
make release
```

This creates:

- `release/diva.js-<version>.tar.gz`
- `release/diva.js-<version>.zip`

These archives are local build artifacts only. They are not uploaded by the GitHub Actions npm publish workflow.

## Manual Publish Path

There is a `make publish` target in the `Makefile`, but it is not the standard release path for this project.

```sh
make publish
```

That command performs a local `npm publish` and does not use the GitHub Actions Trusted Publisher flow. Use it only if you intentionally want to publish from a local machine with valid npm credentials.

## Troubleshooting

### `E404 Not Found - PUT https://registry.npmjs.org/diva.js`

Usually means the publishing identity is not authorized for the package, or the Trusted Publisher configuration in npm does not match the repository/workflow/environment.

Check:

- npm package owner access
- Trusted Publisher org/repo/workflow settings
- GitHub Actions job environment is `npm`

### `422 Unprocessable Entity` with provenance or sigstore validation

Usually means the package metadata does not match the GitHub repository identity in the provenance bundle.

Check:

- `package.json.repository.url` is set to `git+https://github.com/DDMAL/diva.js.git`
- the workflow is publishing from `DDMAL/diva.js`
- the published tag corresponds to the intended release commit

### Publish succeeds on npm, but the workflow still fails

This can happen if `npm publish` is invoked twice. Avoid defining an npm lifecycle script named `publish` that itself runs `npm publish`, because npm will run that script during publication and recurse into a second publish attempt.
