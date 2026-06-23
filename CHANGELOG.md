# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-06-24

### Added

- Initial release, extracted from the `jest-pr.yml` workflow.
- Sticky PR comment with pass/fail, coverage, and duration badges; test-count
  summary; coverage table with PASS/WARN/FAIL status; collapsible per-file
  coverage breakdown; and collapsible failed/skipped test lists.
- Inline check-run annotations on failing test lines (batched at the 50-per-request API limit).
- Actions job summary output.
- Pass/fail gating via `fail-on-error`.
- Action outputs: `success`, `passed`, `failed`, `skipped`, `total`, `coverage-pct`, `duration`.
- Two modes: consume pre-existing Jest result files (default) or run Jest via `run-tests`.
- Graceful degradation outside pull requests and a documented fork (`pull_request_target`) caveat.

[Unreleased]: https://github.com/chathurabuddi/jest-check-action/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/chathurabuddi/jest-check-action/releases/tag/v1.0.0
