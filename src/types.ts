/**
 * Type definitions for the subset of Jest JSON output and coverage-summary
 * output that this action consumes, plus the normalized shapes the renderer
 * works with.
 *
 * Only the fields actually used are declared; Jest emits many more.
 */

/** A single coverage metric block as found in coverage-summary.json. */
export interface CoverageMetric {
  total: number;
  covered: number;
  skipped: number;
  /** Percentage 0–100, or the string "Unknown" for empty metrics. */
  pct: number | string;
}

/** The four-metric coverage block for a file or the `total` aggregate. */
export interface CoverageEntry {
  statements: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  lines: CoverageMetric;
}

/** Raw coverage-summary.json: a `total` entry plus one entry per file. */
export interface CoverageSummary {
  total: CoverageEntry;
  [filePath: string]: CoverageEntry;
}

/** Location of an assertion within its source file. */
export interface AssertionLocation {
  line: number;
  column: number;
}

/** A single test (assertion) result inside a suite. */
export interface AssertionResult {
  status: 'passed' | 'failed' | 'pending' | 'todo' | 'skipped' | 'disabled' | 'focused';
  title: string;
  fullName: string;
  location: AssertionLocation | null;
  failureMessages: string[];
}

/** A test file's result. Older Jest uses `name`; newer adds `testFilePath`. */
export interface SuiteResult {
  testFilePath?: string;
  name?: string;
  startTime?: number;
  endTime?: number;
  assertionResults: AssertionResult[];
}

/** The subset of Jest's `--json` output we rely on. */
export interface JestResults {
  numFailedTests: number;
  numPassedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  numTotalTests: number;
  numFailedTestSuites: number;
  numPassedTestSuites: number;
  success: boolean;
  startTime: number;
  testResults: SuiteResult[];
}

/** Normalized coverage for the four metrics plus the overall mean. */
export interface NormalizedCoverage {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  overall: number;
  raw: CoverageEntry;
}

/** A per-file coverage row that falls below the configured threshold. */
export interface FileCoverage {
  file: string;
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  /** Smallest of the four metric percentages. */
  min: number;
}

/** A failing test, flattened across suites. */
export interface FailedTest {
  name: string;
  file: string;
  message: string;
  line: number;
}

/** A skipped/todo test, flattened across suites. */
export interface SkippedTest {
  title: string;
  file: string;
  reason: 'skip' | 'todo';
}

/** Fully normalized data the renderer and reporters consume. */
export interface Report {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  success: boolean;
  duration: string;
  coverage: NormalizedCoverage | null;
  belowThreshold: FileCoverage[];
  failedTests: FailedTest[];
  skippedTests: SkippedTest[];
  jestVersion: string;
}

/** Resolved, typed action inputs. */
export interface ActionInputs {
  token: string;
  resultsFile: string;
  coverageFile: string;
  runTests: boolean;
  testCommand: string;
  workingDirectory: string;
  coverageThreshold: number;
  comment: boolean;
  commentMarker: string;
  annotations: boolean;
  checkName: string;
  jobSummary: boolean;
  failOnError: boolean;
  maxItems: number;
}

/** Options the renderer needs that are not part of the parsed Report. */
export interface RenderContext {
  serverUrl: string;
  repository: string;
  runId: string;
  headSha: string;
  coverageThreshold: number;
  maxItems: number;
}
