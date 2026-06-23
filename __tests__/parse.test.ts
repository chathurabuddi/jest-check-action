import * as path from 'path';
import { readJson, pctNum, normalizeCoverage, relPath, buildReport } from '../src/parse';
import type {
  CoverageEntry,
  CoverageSummary,
  JestResults,
  SuiteResult,
} from '../src/types';

const FIXTURES = path.join(__dirname, 'fixtures');
const results = readJson<JestResults>(path.join(FIXTURES, 'jest-results.json'))!;
const coverage = readJson<CoverageSummary>(path.join(FIXTURES, 'coverage-summary.json'))!;

describe('readJson', () => {
  it('reads and parses an existing file', () => {
    expect(results.numTotalTests).toBeGreaterThan(0);
  });

  it('returns null for a missing file', () => {
    expect(readJson('/does/not/exist.json')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(readJson(path.join(FIXTURES, '..', 'parse.test.ts'))).toBeNull();
  });
});

describe('pctNum', () => {
  it('returns numeric pct unchanged', () => {
    expect(pctNum({ total: 1, covered: 1, skipped: 0, pct: 50 })).toBe(50);
  });

  it('coerces "Unknown" to 0', () => {
    expect(pctNum({ total: 0, covered: 0, skipped: 0, pct: 'Unknown' })).toBe(0);
  });
});

describe('normalizeCoverage', () => {
  it('computes the mean across four metrics', () => {
    const entry: CoverageEntry = {
      statements: { total: 1, covered: 1, skipped: 0, pct: 100 },
      branches: { total: 1, covered: 1, skipped: 0, pct: 50 },
      functions: { total: 1, covered: 1, skipped: 0, pct: 50 },
      lines: { total: 1, covered: 1, skipped: 0, pct: 100 },
    };
    const n = normalizeCoverage(entry);
    expect(n.overall).toBe(75);
    expect(n.statements).toBe(100);
  });
});

describe('relPath', () => {
  it('prefers testFilePath and strips the workspace prefix', () => {
    const suite = { testFilePath: '/repo/src/a.js', assertionResults: [] } as SuiteResult;
    expect(relPath(suite, '/repo/')).toBe('src/a.js');
  });

  it('falls back to name when testFilePath is absent', () => {
    const suite = { name: '/repo/src/b.js', assertionResults: [] } as SuiteResult;
    expect(relPath(suite, '/repo/')).toBe('src/b.js');
  });

  it('falls back to "unknown" when neither is present', () => {
    const suite = { assertionResults: [] } as SuiteResult;
    expect(relPath(suite, '/repo/')).toBe('unknown');
  });

  it('returns the absolute path unchanged when no workspace given', () => {
    const suite = { name: '/repo/src/c.js', assertionResults: [] } as SuiteResult;
    expect(relPath(suite, '')).toBe('/repo/src/c.js');
  });
});

describe('buildReport', () => {
  const opts = { workspace: '/repo/', threshold: 80, jestVersion: '29.7.0' };

  it('derives test counts including todo in skipped', () => {
    const report = buildReport(results, coverage, opts);
    expect(report.passed).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.skipped).toBe(2); // 1 pending + 1 todo
    expect(report.total).toBe(5);
    expect(report.success).toBe(false);
  });

  it('extracts failed tests with file, line and truncated message', () => {
    const report = buildReport(results, coverage, opts);
    expect(report.failedTests).toHaveLength(1);
    const f = report.failedTests[0];
    expect(f.file).toBe('src/math.test.js');
    expect(f.line).toBe(4);
    expect(f.name).toBe('this one fails');
    expect(f.message.length).toBeLessThanOrEqual(500);
  });

  it('extracts skipped and todo tests with reasons', () => {
    const report = buildReport(results, coverage, opts);
    const reasons = report.skippedTests.map((s) => s.reason).sort();
    expect(reasons).toEqual(['skip', 'todo']);
  });

  it('normalizes coverage and finds files below threshold', () => {
    const report = buildReport(results, coverage, opts);
    expect(report.coverage).not.toBeNull();
    expect(report.belowThreshold).toHaveLength(1);
    expect(report.belowThreshold[0].file).toBe('src/math.js');
  });

  it('handles absent coverage', () => {
    const report = buildReport(results, null, opts);
    expect(report.coverage).toBeNull();
    expect(report.belowThreshold).toEqual([]);
  });

  it('renders duration as a dash when no end times are present', () => {
    const noTimes: JestResults = {
      ...results,
      startTime: 1000,
      testResults: results.testResults.map((t) => ({ ...t, endTime: 0 })),
    };
    expect(buildReport(noTimes, null, opts).duration).toBe('—');
  });

  it('computes duration from suite end times', () => {
    const timed: JestResults = {
      ...results,
      startTime: 1000,
      testResults: [{ assertionResults: [], endTime: 3500 } as SuiteResult],
    };
    expect(buildReport(timed, null, opts).duration).toBe('2.5');
  });

  it('tolerates suites without assertionResults', () => {
    const sparse: JestResults = {
      ...results,
      testResults: [{ name: '/repo/x.js' } as SuiteResult],
    };
    const report = buildReport(sparse, null, opts);
    expect(report.failedTests).toEqual([]);
    expect(report.skippedTests).toEqual([]);
  });

  it('sorts files below threshold by statement coverage ascending', () => {
    const cov: CoverageSummary = {
      total: coverage.total,
      '/repo/b.js': {
        statements: { total: 10, covered: 5, skipped: 0, pct: 50 },
        branches: { total: 1, covered: 1, skipped: 0, pct: 100 },
        functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
        lines: { total: 1, covered: 1, skipped: 0, pct: 100 },
      },
      '/repo/a.js': {
        statements: { total: 10, covered: 1, skipped: 0, pct: 10 },
        branches: { total: 1, covered: 1, skipped: 0, pct: 100 },
        functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
        lines: { total: 1, covered: 1, skipped: 0, pct: 100 },
      },
    };
    const report = buildReport(results, cov, opts);
    expect(report.belowThreshold.map((f) => f.file)).toEqual(['a.js', 'b.js']);
  });

  it('keeps absolute file paths in the breakdown when no workspace is set', () => {
    const cov: CoverageSummary = {
      total: coverage.total,
      '/abs/low.js': {
        statements: { total: 10, covered: 1, skipped: 0, pct: 10 },
        branches: { total: 1, covered: 0, skipped: 0, pct: 0 },
        functions: { total: 1, covered: 0, skipped: 0, pct: 0 },
        lines: { total: 1, covered: 0, skipped: 0, pct: 0 },
      },
    };
    const report = buildReport(results, cov, { ...opts, workspace: '' });
    expect(report.belowThreshold[0].file).toBe('/abs/low.js');
  });

  it('excludes files at/above threshold from the breakdown', () => {
    const cov: CoverageSummary = {
      total: coverage.total,
      '/repo/good.js': {
        statements: { total: 10, covered: 10, skipped: 0, pct: 100 },
        branches: { total: 1, covered: 1, skipped: 0, pct: 100 },
        functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
        lines: { total: 1, covered: 1, skipped: 0, pct: 100 },
      },
    };
    expect(buildReport(results, cov, opts).belowThreshold).toEqual([]);
  });

  it('defaults a failing test line to 1 when location is missing', () => {
    const r: JestResults = {
      ...results,
      testResults: [
        {
          name: '/repo/x.test.js',
          assertionResults: [
            {
              status: 'failed',
              title: 't',
              fullName: 't',
              location: null,
              failureMessages: [],
            },
          ],
        } as SuiteResult,
      ],
    };
    expect(buildReport(r, null, opts).failedTests[0].line).toBe(1);
  });
});
