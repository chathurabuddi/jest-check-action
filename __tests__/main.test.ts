import * as core from '@actions/core';
import * as github from '@actions/github';
import { run } from '../src/main';
import { getInputs } from '../src/inputs';
import { readJson, buildReport } from '../src/parse';
import { buildMarkdown } from '../src/render';
import { runTests } from '../src/runner';
import { setOutputs } from '../src/outputs';
import { writeJobSummary } from '../src/summary';
import { upsertStickyComment, postComment } from '../src/github/comment';
import { postAnnotations } from '../src/github/annotations';
import type { ActionInputs, Report } from '../src/types';

jest.mock('@actions/core');
jest.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'o', repo: 'r' },
    payload: {},
    sha: 'base-sha',
    runId: 42,
    serverUrl: 'https://github.com',
  },
  getOctokit: jest.fn(),
}));
jest.mock('../src/inputs');
jest.mock('../src/parse');
jest.mock('../src/render');
jest.mock('../src/runner');
jest.mock('../src/outputs');
jest.mock('../src/summary');
jest.mock('../src/github/comment');
jest.mock('../src/github/annotations');

const mockedCore = jest.mocked(core);
const mockedGithub = jest.mocked(github);
const mockedGetInputs = jest.mocked(getInputs);
const mockedReadJson = jest.mocked(readJson);
const mockedBuildReport = jest.mocked(buildReport);
const mockedBuildMarkdown = jest.mocked(buildMarkdown);
const mockedRunTests = jest.mocked(runTests);
const mockedSetOutputs = jest.mocked(setOutputs);
const mockedWriteJobSummary = jest.mocked(writeJobSummary);
const mockedUpsert = jest.mocked(upsertStickyComment);
const mockedPostComment = jest.mocked(postComment);
const mockedPostAnnotations = jest.mocked(postAnnotations);

const OCTOKIT = { id: 'octokit' } as unknown as ReturnType<typeof github.getOctokit>;

function inputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    token: 'tok',
    resultsFile: 'jest-results.json',
    coverageFile: 'coverage/coverage-summary.json',
    runTests: false,
    testCommand: 'npm test',
    workingDirectory: '.',
    coverageThreshold: 80,
    comment: true,
    commentMarker: '<!-- m -->',
    annotations: true,
    checkName: 'Jest Failures',
    jobSummary: true,
    failOnError: true,
    maxItems: 20,
    ...overrides,
  };
}

function report(overrides: Partial<Report> = {}): Report {
  return {
    passed: 1,
    failed: 0,
    skipped: 0,
    total: 1,
    success: true,
    duration: '1.0',
    coverage: null,
    belowThreshold: [],
    failedTests: [],
    skippedTests: [],
    jestVersion: '29.7.0',
    ...overrides,
  };
}

/** Configure readJson by path: results present/absent, coverage, jest pkg. */
function stubFiles(opts: {
  results?: unknown;
  coverage?: unknown;
  jestPkg?: unknown;
}): void {
  mockedReadJson.mockImplementation((p: string) => {
    if (p.includes('jest/package.json')) return (opts.jestPkg ?? null) as never;
    if (p.includes('coverage-summary.json')) return (opts.coverage ?? null) as never;
    if (p.includes('jest-results.json')) return (opts.results ?? null) as never;
    return null as never;
  });
}

beforeEach(() => {
  mockedGithub.context.payload = {};
  mockedGithub.getOctokit.mockReturnValue(OCTOKIT);
  mockedBuildMarkdown.mockReturnValue('MARKDOWN');
  mockedBuildReport.mockReturnValue(report());
  mockedGetInputs.mockReturnValue(inputs());
  stubFiles({ results: { ok: true }, jestPkg: { version: '29.7.0' } });
});

function asPullRequest(): void {
  mockedGithub.context.payload = {
    pull_request: { number: 5, head: { sha: 'head-sha' } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('run — running tests', () => {
  it('runs tests when run-tests is enabled', async () => {
    mockedGetInputs.mockReturnValue(inputs({ runTests: true }));
    asPullRequest();
    await run();
    expect(mockedRunTests).toHaveBeenCalledWith('npm test', 'jest-results.json', '.');
  });

  it('does not run tests by default', async () => {
    asPullRequest();
    await run();
    expect(mockedRunTests).not.toHaveBeenCalled();
  });
});

describe('run — missing results file', () => {
  it('posts a fallback comment and fails when on a PR with a token', async () => {
    stubFiles({ results: null });
    asPullRequest();
    await run();
    expect(mockedPostComment).toHaveBeenCalled();
    expect(mockedCore.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('results file not found'),
    );
    expect(mockedBuildReport).not.toHaveBeenCalled();
  });

  it('fails without commenting when no token is available', async () => {
    mockedGetInputs.mockReturnValue(inputs({ token: '' }));
    stubFiles({ results: null });
    asPullRequest();
    await run();
    expect(mockedPostComment).not.toHaveBeenCalled();
    expect(mockedCore.setFailed).toHaveBeenCalled();
  });

  it('fails without commenting when not on a pull request', async () => {
    stubFiles({ results: null });
    await run();
    expect(mockedPostComment).not.toHaveBeenCalled();
    expect(mockedCore.setFailed).toHaveBeenCalled();
  });
});

describe('run — reporting', () => {
  it('uses the PR head sha and posts the sticky comment on a PR', async () => {
    asPullRequest();
    await run();
    expect(mockedSetOutputs).toHaveBeenCalled();
    expect(mockedWriteJobSummary).toHaveBeenCalledWith('MARKDOWN');
    expect(mockedUpsert).toHaveBeenCalledWith(
      OCTOKIT,
      { owner: 'o', repo: 'r', issueNumber: 5 },
      '<!-- m -->',
      'MARKDOWN',
    );
    expect(mockedBuildMarkdown.mock.calls[0][1].headSha).toBe('head-sha');
  });

  it('falls back to context.sha outside a pull request', async () => {
    await run();
    expect(mockedBuildMarkdown.mock.calls[0][1].headSha).toBe('base-sha');
  });

  it('skips the job summary when disabled', async () => {
    mockedGetInputs.mockReturnValue(inputs({ jobSummary: false }));
    asPullRequest();
    await run();
    expect(mockedWriteJobSummary).not.toHaveBeenCalled();
  });

  it('warns instead of commenting when no token is present', async () => {
    mockedGetInputs.mockReturnValue(inputs({ token: '' }));
    asPullRequest();
    await run();
    expect(mockedUpsert).not.toHaveBeenCalled();
    expect(mockedCore.warning).toHaveBeenCalledWith(
      expect.stringContaining('skipping PR comment'),
    );
  });

  it('skips the comment with an info log outside a pull request', async () => {
    await run();
    expect(mockedUpsert).not.toHaveBeenCalled();
    expect(mockedCore.info).toHaveBeenCalledWith(
      expect.stringContaining('Not a pull request'),
    );
  });

  it('does not comment when comment is disabled', async () => {
    mockedGetInputs.mockReturnValue(inputs({ comment: false }));
    asPullRequest();
    await run();
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it('resolves the jest version as "unknown" when the package is missing', async () => {
    stubFiles({ results: { ok: true }, jestPkg: null });
    asPullRequest();
    await run();
    expect(mockedBuildReport.mock.calls[0][2].jestVersion).toBe('unknown');
  });

  it('passes the resolved jest version through when available', async () => {
    asPullRequest();
    await run();
    expect(mockedBuildReport.mock.calls[0][2].jestVersion).toBe('29.7.0');
  });

  it('sets the workspace prefix from GITHUB_WORKSPACE', async () => {
    process.env.GITHUB_WORKSPACE = '/ws';
    asPullRequest();
    await run();
    expect(mockedBuildReport.mock.calls[0][2].workspace).toBe('/ws/');
    delete process.env.GITHUB_WORKSPACE;
  });

  it('uses an empty workspace prefix when GITHUB_WORKSPACE is unset', async () => {
    delete process.env.GITHUB_WORKSPACE;
    asPullRequest();
    await run();
    expect(mockedBuildReport.mock.calls[0][2].workspace).toBe('');
  });
});

describe('run — annotations', () => {
  it('posts annotations when there are failed tests and a token', async () => {
    mockedBuildReport.mockReturnValue(
      report({
        success: false,
        failed: 1,
        failedTests: [{ name: 't', file: 'f', message: 'm', line: 1 }],
      }),
    );
    asPullRequest();
    await run();
    expect(mockedPostAnnotations).toHaveBeenCalledWith(
      OCTOKIT,
      { owner: 'o', repo: 'r' },
      'Jest Failures',
      'head-sha',
      [{ name: 't', file: 'f', message: 'm', line: 1 }],
    );
  });

  it('warns instead of annotating when there is no token', async () => {
    mockedGetInputs.mockReturnValue(inputs({ token: '' }));
    mockedBuildReport.mockReturnValue(
      report({
        success: false,
        failed: 1,
        failedTests: [{ name: 't', file: 'f', message: 'm', line: 1 }],
      }),
    );
    asPullRequest();
    await run();
    expect(mockedPostAnnotations).not.toHaveBeenCalled();
    expect(mockedCore.warning).toHaveBeenCalledWith(
      expect.stringContaining('skipping check annotations'),
    );
  });

  it('skips annotations when there are no failed tests', async () => {
    await run();
    expect(mockedPostAnnotations).not.toHaveBeenCalled();
  });

  it('skips annotations when disabled', async () => {
    mockedGetInputs.mockReturnValue(inputs({ annotations: false }));
    mockedBuildReport.mockReturnValue(
      report({
        success: false,
        failed: 1,
        failedTests: [{ name: 't', file: 'f', message: 'm', line: 1 }],
      }),
    );
    asPullRequest();
    await run();
    expect(mockedPostAnnotations).not.toHaveBeenCalled();
  });
});

describe('run — gating', () => {
  it('fails the job when tests failed and fail-on-error is set', async () => {
    mockedBuildReport.mockReturnValue(report({ success: false, failed: 2 }));
    asPullRequest();
    await run();
    expect(mockedCore.setFailed).toHaveBeenCalledWith('2 tests failed.');
  });

  it('uses singular wording for a single failure', async () => {
    mockedBuildReport.mockReturnValue(report({ success: false, failed: 1 }));
    asPullRequest();
    await run();
    expect(mockedCore.setFailed).toHaveBeenCalledWith('1 test failed.');
  });

  it('does not fail when tests passed', async () => {
    asPullRequest();
    await run();
    expect(mockedCore.setFailed).not.toHaveBeenCalled();
  });

  it('does not fail when fail-on-error is disabled despite failures', async () => {
    mockedGetInputs.mockReturnValue(inputs({ failOnError: false }));
    mockedBuildReport.mockReturnValue(report({ success: false, failed: 1 }));
    asPullRequest();
    await run();
    expect(mockedCore.setFailed).not.toHaveBeenCalled();
  });
});
