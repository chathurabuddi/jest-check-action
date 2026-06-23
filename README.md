# Jest PR Reporter

[![CI](https://github.com/chathurabuddi/jest-check-action/actions/workflows/ci.yml/badge.svg)](https://github.com/chathurabuddi/jest-check-action/actions/workflows/ci.yml)
[![Marketplace](https://img.shields.io/badge/Marketplace-Jest%20PR%20Reporter-blue?logo=github)](https://github.com/marketplace/actions/jest-pr-reporter)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A GitHub Action that turns [Jest](https://jestjs.io/) results into a rich, **sticky pull-request comment**, **inline check annotations** on failing lines, an **Actions job summary**, and **pass/fail gating** — all from your existing Jest run. Highly configurable, with sensible defaults for every input.

<!-- A screenshot of the rendered comment can be added here once published. -->

## What you get

- **Sticky PR comment** — badges for pass/fail, coverage %, and duration; a test-count summary table; a coverage table with PASS/WARN/FAIL status; a collapsible per-file coverage breakdown (worst offenders first); and collapsible failed- and skipped-test lists. Updates in place on every push — never spams the PR.
- **Inline check annotations** — a red ✗ at the exact failing line in the diff, with the test name and stack trace.
- **Job summary** — the same report on the Actions run summary tab.
- **Gating** — fails the job when any test fails, so branch protection can block the merge.
- **Outputs** — counts, success flag, coverage %, and duration for downstream steps.

## Quick start

By default the action **consumes Jest output that a previous step produced**. Run Jest with the reporting flags, then add the reporter:

```yaml
name: Tests
on:
  pull_request:

permissions:
  contents: read
  pull-requests: write # post the sticky comment
  checks: write # post failure annotations

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci

      - name: Run Jest
        run: npx jest --json --outputFile=jest-results.json --coverage --coverageReporters=json-summary --testLocationInResults --ci
        continue-on-error: true # let the reporter own pass/fail gating

      - name: Report results
        uses: chathurabuddi/jest-check-action@v1
```

### Required Jest flags (consume-results mode)

The action reads two files. Produce them with exactly these flags:

| Flag                                          | Why                                                |
| --------------------------------------------- | -------------------------------------------------- |
| `--json --outputFile=jest-results.json`       | machine-readable results (counts, failures, skips) |
| `--coverage --coverageReporters=json-summary` | writes `coverage/coverage-summary.json`            |
| `--testLocationInResults`                     | line numbers for inline annotations                |
| `--ci`                                        | deterministic CI behaviour                         |

> Run Jest with `continue-on-error: true` so a test failure doesn't abort the workflow before the report is posted — let `fail-on-error` (on by default) do the gating.

### Let the action run Jest for you

Set `run-tests: true` and the action runs the command and appends the flags above automatically:

```yaml
- name: Run & report
  uses: chathurabuddi/jest-check-action@v1
  with:
    run-tests: true
    test-command: npm test # the reporting flags are appended for you
```

> Run mode shells out as `bash -c "<test-command> -- <flags>"` (Linux/macOS runners). The `--` forwarding matches npm scripts; for other package managers, prefer consume-results mode.

## Inputs

Every input is optional and has a default.

| Input                | Default                          | Description                                                                                                 |
| -------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `token`              | `${{ github.token }}`            | Token used to post the comment and annotations.                                                             |
| `results-file`       | `jest-results.json`              | Path to Jest's JSON output.                                                                                 |
| `coverage-file`      | `coverage/coverage-summary.json` | Path to `coverage-summary.json`. Coverage sections are omitted if missing.                                  |
| `run-tests`          | `false`                          | Run `test-command` before reporting instead of consuming existing files.                                    |
| `test-command`       | `npm test`                       | Command used when `run-tests` is `true`. Reporting flags are appended.                                      |
| `working-directory`  | `.`                              | Directory to resolve files against / run tests from.                                                        |
| `coverage-threshold` | `80`                             | Boundary for PASS/WARN/FAIL and the per-file breakdown.                                                     |
| `comment`            | `true`                           | Post (and update) the sticky PR comment.                                                                    |
| `comment-marker`     | `<!-- jest-pr-reporter -->`      | Hidden id of the sticky comment. Use distinct markers to run multiple instances on one PR.                  |
| `annotations`        | `true`                           | Post inline check-run annotations on failing lines.                                                         |
| `check-name`         | `Jest Failures`                  | Name of the annotations check run. Keep it distinct from the job-level check required by branch protection. |
| `job-summary`        | `true`                           | Write the report to the Actions job summary.                                                                |
| `fail-on-error`      | `true`                           | Fail the action when any test failed.                                                                       |
| `max-items`          | `20`                             | Max files / tests rendered in each collapsible section.                                                     |

## Outputs

| Output                                    | Description                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `success`                                 | `true` when all tests passed.                                           |
| `passed` / `failed` / `skipped` / `total` | Test counts (`skipped` includes `todo`).                                |
| `coverage-pct`                            | Overall coverage (mean of the four metrics), or empty when no coverage. |
| `duration`                                | Run duration in seconds, or `—`.                                        |

```yaml
- id: jest
  uses: chathurabuddi/jest-check-action@v1
- run: echo "Coverage was ${{ steps.jest.outputs.coverage-pct }}%"
```

## Permissions

```yaml
permissions:
  contents: read
  pull-requests: write # sticky comment
  checks: write # failure annotations
```

Drop `pull-requests: write` if `comment: false`; drop `checks: write` if `annotations: false`.

## Behaviour outside pull requests & on forks

- **Non-PR events** (`push`, `workflow_dispatch`): there's no PR to comment on, so the comment is skipped — the job summary, annotations, outputs, and gating still run.
- **Pull requests from forks**: the default `GITHUB_TOKEN` is **read-only** on `pull_request`, so posting the comment/annotations will fail with a 403. To support fork PRs, run the reporting job on the [`pull_request_target`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#pull_request_target) event (which grants a writable token) and check out the PR head explicitly. Understand the [security implications](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/) before doing so.

## Versioning

Pin to the major tag `@v1` to receive non-breaking updates, or pin to a full `@v1.2.3` / commit SHA for maximum stability.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) (architecture & conventions for humans and AI agents).

## License

[MIT](LICENSE) © Chathura Buddhika
