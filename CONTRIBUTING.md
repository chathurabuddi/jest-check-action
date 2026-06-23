# Contributing

Thanks for your interest in improving Jest PR Reporter! Please also read [AGENTS.md](AGENTS.md) for the architecture and the two hard rules.

## Development setup

```bash
git clone https://github.com/chathurabuddi/jest-check-action.git
cd jest-check-action
npm ci
```

## Before you open a PR

Run the full gate locally — CI runs the same checks:

```bash
npm run all
```

This runs `format:check`, `lint`, `typecheck`, tests with the **100% coverage gate**, and the `ncc` build.

### The two things CI will reject

1. **Coverage below 100%.** Add tests for any new branch.
2. **A stale `dist/`.** The action ships the bundled `dist/index.js`, not the source. After any change under `src/`, run `npm run build` and commit `dist/` in the same PR. CI runs `git diff --exit-code dist/` and fails if it drifted.

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, …). The type drives the changelog and the next version bump.

## Releasing (maintainers)

1. Update `CHANGELOG.md` and bump the version in `package.json`.
2. Merge to `main`; ensure CI is green.
3. Tag and push:
   ```bash
   git tag v1.2.3 && git push origin v1.2.3
   ```
4. The `release.yml` workflow builds, verifies `dist/`, creates the GitHub Release, and moves the `v1` major tag to the new commit.

### First-time Marketplace publish (one-time, manual)

The GitHub Marketplace requires a one-time manual opt-in that the API cannot perform:

1. The repository must be **public** and the owner must have **2FA** enabled.
2. Open the newly created Release in the GitHub UI → check **"Publish this Action to the GitHub Marketplace"**.
3. Choose categories and accept the GitHub Marketplace Developer Agreement.
4. The action's `name:` must be unique across the Marketplace.

Subsequent tagged releases update the existing listing automatically.

## Reporting bugs

Open an issue with a minimal reproduction: the workflow snippet, the Jest version, and (if possible) the `jest-results.json` shape.
