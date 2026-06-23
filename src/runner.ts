/**
 * Optional Jest runner. Only used when `run-tests` is "true"; otherwise the
 * action consumes result files produced by a previous workflow step.
 *
 * The reporting flags Jest needs to emit machine-readable output are appended
 * automatically, so consumers only specify the base command (default
 * `npm test`).
 */
import * as core from '@actions/core';
import * as exec from '@actions/exec';

/** Flags appended to the test command so Jest emits the files we parse. */
export function reportingFlags(resultsFile: string): string[] {
  return [
    '--json',
    `--outputFile=${resultsFile}`,
    '--coverage',
    '--coverageReporters=json-summary',
    '--testLocationInResults',
    '--ci',
  ];
}

/**
 * Run the test command with reporting flags appended. A non-zero exit code is
 * expected when tests fail and is not treated as an error here — the report is
 * derived from the emitted files, and gating happens later.
 */
export async function runTests(
  testCommand: string,
  resultsFile: string,
  cwd: string,
): Promise<void> {
  const flags = reportingFlags(resultsFile).join(' ');
  const fullCommand = `${testCommand} -- ${flags}`;
  core.info(`Running tests: ${fullCommand}`);
  await exec.exec('bash', ['-c', fullCommand], {
    cwd,
    ignoreReturnCode: true,
  });
}
