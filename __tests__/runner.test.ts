import * as exec from '@actions/exec';
import { reportingFlags, runTests } from '../src/runner';

jest.mock('@actions/core');
jest.mock('@actions/exec');

const mockedExec = jest.mocked(exec);

describe('reportingFlags', () => {
  it('includes the json/coverage/ci flags with the results path', () => {
    expect(reportingFlags('out.json')).toEqual([
      '--json',
      '--outputFile=out.json',
      '--coverage',
      '--coverageReporters=json-summary',
      '--testLocationInResults',
      '--ci',
    ]);
  });
});

describe('runTests', () => {
  it('runs the command with appended flags via bash, ignoring exit code', async () => {
    mockedExec.exec.mockResolvedValue(1);
    await runTests('npm test', 'jest-results.json', '/work');
    expect(mockedExec.exec).toHaveBeenCalledWith(
      'bash',
      [
        '-c',
        'npm test -- --json --outputFile=jest-results.json --coverage --coverageReporters=json-summary --testLocationInResults --ci',
      ],
      { cwd: '/work', ignoreReturnCode: true },
    );
  });
});
