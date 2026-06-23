import * as core from '@actions/core';
import { getInputs } from '../src/inputs';

jest.mock('@actions/core');

const mockedCore = jest.mocked(core);

function withInputs(
  strings: Record<string, string>,
  bools: Record<string, boolean>,
): void {
  mockedCore.getInput.mockImplementation((name: string) => strings[name] ?? '');
  mockedCore.getBooleanInput.mockImplementation((name: string) => bools[name] ?? false);
}

describe('getInputs', () => {
  it('applies defaults for blank string inputs and parses booleans', () => {
    withInputs(
      {},
      {
        'run-tests': false,
        comment: true,
        annotations: true,
        'job-summary': true,
        'fail-on-error': true,
      },
    );
    const inputs = getInputs();
    expect(inputs.resultsFile).toBe('jest-results.json');
    expect(inputs.coverageFile).toBe('coverage/coverage-summary.json');
    expect(inputs.testCommand).toBe('npm test');
    expect(inputs.workingDirectory).toBe('.');
    expect(inputs.coverageThreshold).toBe(80);
    expect(inputs.commentMarker).toBe('<!-- jest-pr-reporter -->');
    expect(inputs.checkName).toBe('Jest Failures');
    expect(inputs.maxItems).toBe(20);
    expect(inputs.comment).toBe(true);
    expect(inputs.runTests).toBe(false);
  });

  it('passes through provided values', () => {
    withInputs(
      {
        token: 'tok',
        'results-file': 'r.json',
        'coverage-file': 'c.json',
        'test-command': 'yarn test',
        'working-directory': 'app',
        'coverage-threshold': '90',
        'comment-marker': '<!-- x -->',
        'check-name': 'My Check',
        'max-items': '5',
      },
      {
        'run-tests': true,
        comment: false,
        annotations: false,
        'job-summary': false,
        'fail-on-error': false,
      },
    );
    const inputs = getInputs();
    expect(inputs.token).toBe('tok');
    expect(inputs.resultsFile).toBe('r.json');
    expect(inputs.coverageThreshold).toBe(90);
    expect(inputs.maxItems).toBe(5);
    expect(inputs.runTests).toBe(true);
    expect(inputs.failOnError).toBe(false);
  });

  it('throws when an integer input is not a number', () => {
    withInputs({ 'coverage-threshold': 'abc' }, {});
    expect(() => getInputs()).toThrow('Input "coverage-threshold" must be an integer');
  });
});
