import * as core from '@actions/core';
import { setOutputs } from '../src/outputs';
import type { Report } from '../src/types';

jest.mock('@actions/core');

const mockedCore = jest.mocked(core);

function report(overrides: Partial<Report> = {}): Report {
  return {
    passed: 2,
    failed: 1,
    skipped: 3,
    total: 6,
    success: false,
    duration: '1.2',
    coverage: null,
    belowThreshold: [],
    failedTests: [],
    skippedTests: [],
    jestVersion: '29.7.0',
    ...overrides,
  };
}

describe('setOutputs', () => {
  it('sets all outputs with an empty coverage when none present', () => {
    setOutputs(report());
    expect(mockedCore.setOutput).toHaveBeenCalledWith('success', false);
    expect(mockedCore.setOutput).toHaveBeenCalledWith('passed', 2);
    expect(mockedCore.setOutput).toHaveBeenCalledWith('failed', 1);
    expect(mockedCore.setOutput).toHaveBeenCalledWith('skipped', 3);
    expect(mockedCore.setOutput).toHaveBeenCalledWith('total', 6);
    expect(mockedCore.setOutput).toHaveBeenCalledWith('coverage-pct', '');
    expect(mockedCore.setOutput).toHaveBeenCalledWith('duration', '1.2');
  });

  it('formats coverage to one decimal when present', () => {
    setOutputs(
      report({
        coverage: {
          statements: 1,
          branches: 1,
          functions: 1,
          lines: 1,
          overall: 47.915,
          raw: {
            statements: { total: 1, covered: 1, skipped: 0, pct: 1 },
            branches: { total: 1, covered: 1, skipped: 0, pct: 1 },
            functions: { total: 1, covered: 1, skipped: 0, pct: 1 },
            lines: { total: 1, covered: 1, skipped: 0, pct: 1 },
          },
        },
      }),
    );
    expect(mockedCore.setOutput).toHaveBeenCalledWith('coverage-pct', '47.9');
  });
});
