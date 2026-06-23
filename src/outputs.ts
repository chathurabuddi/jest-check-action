/**
 * Publishes action outputs from the parsed {@link Report}.
 */
import * as core from '@actions/core';
import type { Report } from './types.js';

export function setOutputs(report: Report): void {
  core.setOutput('success', report.success);
  core.setOutput('passed', report.passed);
  core.setOutput('failed', report.failed);
  core.setOutput('skipped', report.skipped);
  core.setOutput('total', report.total);
  core.setOutput(
    'coverage-pct',
    report.coverage ? report.coverage.overall.toFixed(1) : '',
  );
  core.setOutput('duration', report.duration);
}
