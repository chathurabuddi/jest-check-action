# AGENTS.md

Guidance for AI agents **and** humans working in this repository. Read this before making changes.

## What this is

A **TypeScript GitHub Action** that reports Jest results to a PR (sticky comment), the diff (check annotations), and the run (job summary), and gates the job. It was extracted from a single-repo workflow (`jest-pr.yml`) into a reusable, fully-tested action.

## Two hard rules

1. **Coverage must stay at 100%.** `jest.config.js` enforces a global 100% threshold (statements/branches/functions/lines). Any new branch needs a test. `src/index.ts` is the only file excluded (a thin entrypoint).
2. **`dist/` must be rebuilt and committed with every `src/` change.** The action runs `dist/index.js` (bundled by `ncc`), not the TypeScript source. CI fails if `dist/` is stale (`git diff --exit-code dist/`). Always run `npm run build` and commit the result.

## Architecture

The design isolates **pure, easily-tested logic** from **I/O**. Orchestration is thin.

```
src/
  index.ts            entrypoint — calls run(), istanbul-ignored
  main.ts             run() — orchestrates everything (the only place that wires I/O together)
  inputs.ts           read + validate action inputs (@actions/core)
  types.ts            all shared types (Jest output subset, coverage, Report, inputs)
  parse.ts            readJson + buildReport: raw Jest/coverage JSON -> normalized Report (pure except readJson)
  badges.ts           shields.io URL builders + colour logic (pure)
  render.ts           buildMarkdown(report, ctx): Report -> comment/summary Markdown (pure, the bulk)
  runner.ts           optional `bash -c <cmd>` Jest runner (@actions/exec)
  summary.ts          write job summary (@actions/core)
  outputs.ts          set action outputs (@actions/core)
  github/
    comment.ts        sticky comment upsert (octokit)
    annotations.ts    failure check-run annotations, batched at 50 (octokit)
__tests__/
  *.test.ts           one suite per module
  fixtures/           real Jest output captured from an actual run (see below)
```

**Data flow:** `inputs` → (`runner`?) → `parse.readJson` + `parse.buildReport` → `render.buildMarkdown` → `summary` / `github/comment` / `github/annotations` / `outputs` → gate.

## Conventions

- Keep `render.ts`, `badges.ts`, and `buildReport` **pure** — no `fs`, no `process`, no octokit. That is what keeps coverage at 100% cheaply. Push I/O up into `main.ts`.
- Source uses NodeNext ESM `.js` import specifiers (e.g. `from './parse.js'`). Jest maps these back to `.ts` via `moduleNameMapper`. Keep the `.js` suffix on relative imports.
- All shared types live in `src/types.ts`.
- Logic ported from the original `jest-pr.yml` (badge encoding, colour bands, 50-annotation batching, `head.sha` links, sticky marker) must stay behaviourally faithful — see comments referencing it.

## Test fixtures

`__tests__/fixtures/{jest-results.json,coverage-summary.json}` are **real** Jest output (captured from a sample project, `coverageMap` stripped, absolute paths normalized to `/repo`). They contain a passing, failing, skipped (`pending`), and `todo` test, plus a below-threshold file — so every parse/render branch has real data. If you regenerate them, keep that variety.

## Commands

```bash
npm ci              # install
npm test            # jest + 100% coverage gate
npm run lint        # eslint
npm run format      # prettier --write   (format:check for verify)
npm run typecheck   # tsc --noEmit
npm run build       # ncc bundle -> dist/  (commit the result!)
npm run all         # format:check + lint + typecheck + test:ci + build  (run before pushing)
```

## Adding a report section

1. Extend the `Report` type in `types.ts` and populate it in `buildReport` (`parse.ts`).
2. Render it in `buildMarkdown` (`render.ts`).
3. Add tests covering empty / populated / overflow (`> max-items`) cases.
4. `npm run all`, commit `src/` **and** `dist/`.

## Releasing

Tag a SemVer release (`vX.Y.Z`) on `main`. The release workflow bundles, verifies `dist/`, creates the GitHub Release, and moves the major tag (`vX`). The **first** Marketplace publish is a one-time manual step in the Release UI (see CONTRIBUTING.md).
