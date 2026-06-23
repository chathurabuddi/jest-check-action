/**
 * Reads and validates action inputs via `@actions/core`.
 */
import * as core from '@actions/core';
import type { ActionInputs } from './types.js';

/** Parse an integer input, falling back to `fallback` when blank or invalid. */
function intInput(name: string, fallback: number): number {
  const raw = core.getInput(name);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Input "${name}" must be an integer, received "${raw}".`);
  }
  return n;
}

export function getInputs(): ActionInputs {
  return {
    token: core.getInput('token'),
    resultsFile: core.getInput('results-file') || 'jest-results.json',
    coverageFile: core.getInput('coverage-file') || 'coverage/coverage-summary.json',
    runTests: core.getBooleanInput('run-tests'),
    testCommand: core.getInput('test-command') || 'npm test',
    workingDirectory: core.getInput('working-directory') || '.',
    coverageThreshold: intInput('coverage-threshold', 80),
    comment: core.getBooleanInput('comment'),
    commentMarker: core.getInput('comment-marker') || '<!-- jest-pr-reporter -->',
    annotations: core.getBooleanInput('annotations'),
    checkName: core.getInput('check-name') || 'Jest Failures',
    jobSummary: core.getBooleanInput('job-summary'),
    failOnError: core.getBooleanInput('fail-on-error'),
    maxItems: intInput('max-items', 20),
  };
}
