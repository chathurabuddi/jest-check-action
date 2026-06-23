/**
 * Parsing and normalization of Jest's `--json` output and the
 * `coverage-summary.json` file into a single {@link Report}.
 *
 * `readJson` is the only function that touches the filesystem; everything
 * else is a pure transform.
 */
import * as fs from 'fs';
import type {
  CoverageEntry,
  CoverageMetric,
  CoverageSummary,
  JestResults,
  NormalizedCoverage,
  Report,
  SuiteResult,
} from './types.js';

/** Read and JSON-parse a file, returning `null` on any error (missing/malformed). */
export function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

/** Coerce a coverage `pct` (which may be the string "Unknown") to a number. */
export function pctNum(metric: CoverageMetric): number {
  return typeof metric.pct === 'number' ? metric.pct : 0;
}

/** Normalize a coverage entry to four numbers plus their mean. */
export function normalizeCoverage(entry: CoverageEntry): NormalizedCoverage {
  const statements = pctNum(entry.statements);
  const branches = pctNum(entry.branches);
  const functions = pctNum(entry.functions);
  const lines = pctNum(entry.lines);
  return {
    statements,
    branches,
    functions,
    lines,
    overall: (statements + branches + functions + lines) / 4,
    raw: entry,
  };
}

/** Path of a suite relative to the workspace; tolerant of Jest version differences. */
export function relPath(suite: SuiteResult, workspace: string): string {
  const abs = suite.testFilePath || suite.name || 'unknown';
  return workspace && abs.startsWith(workspace) ? abs.slice(workspace.length) : abs;
}

interface BuildOptions {
  workspace: string;
  threshold: number;
  jestVersion: string;
}

/** Combine parsed Jest results and (optional) coverage into a {@link Report}. */
export function buildReport(
  results: JestResults,
  coverageSummary: CoverageSummary | null,
  opts: BuildOptions,
): Report {
  const { workspace, threshold, jestVersion } = opts;

  // Duration: span from the earliest startTime to the latest suite endTime.
  const endTimes = results.testResults.map((t) => t.endTime || 0).filter((t) => t > 0);
  const duration = endTimes.length
    ? ((Math.max(...endTimes) - results.startTime) / 1000).toFixed(1)
    : '—';

  const failedTests = results.testResults.flatMap((suite) => {
    const file = relPath(suite, workspace);
    return (suite.assertionResults || [])
      .filter((a) => a.status === 'failed')
      .map((a) => ({
        name: a.fullName,
        file,
        message: (a.failureMessages[0] || '').slice(0, 500),
        line: a.location?.line ?? 1,
      }));
  });

  const skippedTests = results.testResults.flatMap((suite) => {
    const file = relPath(suite, workspace);
    return (suite.assertionResults || [])
      .filter((a) => a.status === 'pending' || a.status === 'todo')
      .map((a) => ({
        title: a.title,
        file,
        reason: (a.status === 'todo' ? 'todo' : 'skip') as 'todo' | 'skip',
      }));
  });

  let coverage: NormalizedCoverage | null = null;
  const belowThreshold: Report['belowThreshold'] = [];
  if (coverageSummary?.total) {
    coverage = normalizeCoverage(coverageSummary.total);
    for (const [file, entry] of Object.entries(coverageSummary)) {
      if (file === 'total') continue;
      const c = normalizeCoverage(entry);
      const min = Math.min(c.statements, c.branches, c.functions, c.lines);
      if (min < threshold) {
        belowThreshold.push({
          file:
            workspace && file.startsWith(workspace) ? file.slice(workspace.length) : file,
          statements: c.statements,
          branches: c.branches,
          functions: c.functions,
          lines: c.lines,
          min,
        });
      }
    }
    belowThreshold.sort((a, b) => a.statements - b.statements);
  }

  return {
    passed: results.numPassedTests,
    failed: results.numFailedTests,
    skipped: results.numPendingTests + results.numTodoTests,
    total: results.numTotalTests,
    success: results.success,
    duration,
    coverage,
    belowThreshold,
    failedTests,
    skippedTests,
    jestVersion,
  };
}
