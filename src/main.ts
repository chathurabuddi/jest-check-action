/**
 * Orchestrates the action: (optionally) run Jest, parse results + coverage,
 * render the report, then post the sticky comment, check annotations, and job
 * summary, set outputs, and gate the job.
 *
 * Degrades gracefully outside pull requests (skips the comment) and when the
 * token cannot post (logs a warning instead of throwing).
 */
import * as path from 'path';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { getInputs } from './inputs.js';
import { readJson, buildReport } from './parse.js';
import { buildMarkdown } from './render.js';
import { runTests } from './runner.js';
import { setOutputs } from './outputs.js';
import { writeJobSummary } from './summary.js';
import { upsertStickyComment, postComment } from './github/comment.js';
import { postAnnotations } from './github/annotations.js';
import type { CoverageSummary, JestResults, RenderContext } from './types.js';

/** Read the project's installed Jest version, or "unknown" when unavailable. */
function resolveJestVersion(workingDirectory: string): string {
  const pkg = readJson<{ version: string }>(
    path.resolve(workingDirectory, 'node_modules/jest/package.json'),
  );
  return pkg?.version ?? 'unknown';
}

export async function run(): Promise<void> {
  const inputs = getInputs();
  const ctx = github.context;
  const prNumber = ctx.payload.pull_request?.number;
  const headSha = (ctx.payload.pull_request?.head?.sha as string | undefined) ?? ctx.sha;

  const resultsPath = path.resolve(inputs.workingDirectory, inputs.resultsFile);
  const coveragePath = path.resolve(inputs.workingDirectory, inputs.coverageFile);

  if (inputs.runTests) {
    await runTests(inputs.testCommand, inputs.resultsFile, inputs.workingDirectory);
  }

  const results = readJson<JestResults>(resultsPath);
  const octokit = inputs.token ? github.getOctokit(inputs.token) : null;
  const runUrl = `${ctx.serverUrl}/${ctx.repo.owner}/${ctx.repo.repo}/actions/runs/${ctx.runId}`;

  if (!results) {
    const message = `⚠️ **Jest** — results file not found at \`${inputs.resultsFile}\`. [Check the run logs](${runUrl}).`;
    core.error(message);
    if (octokit && inputs.comment && prNumber) {
      await postComment(
        octokit,
        { owner: ctx.repo.owner, repo: ctx.repo.repo, issueNumber: prNumber },
        message,
      );
    }
    core.setFailed(`Jest results file not found: ${inputs.resultsFile}`);
    return;
  }

  const coverage = readJson<CoverageSummary>(coveragePath);
  const workspace = process.env.GITHUB_WORKSPACE
    ? `${process.env.GITHUB_WORKSPACE}/`
    : '';

  const report = buildReport(results, coverage, {
    workspace,
    threshold: inputs.coverageThreshold,
    jestVersion: resolveJestVersion(inputs.workingDirectory),
  });

  const renderCtx: RenderContext = {
    serverUrl: ctx.serverUrl,
    repository: `${ctx.repo.owner}/${ctx.repo.repo}`,
    runId: String(ctx.runId),
    headSha,
    coverageThreshold: inputs.coverageThreshold,
    maxItems: inputs.maxItems,
  };
  const markdown = buildMarkdown(report, renderCtx);

  setOutputs(report);

  if (inputs.jobSummary) {
    await writeJobSummary(markdown);
  }

  if (inputs.comment) {
    if (!octokit) {
      core.warning('No token available — skipping PR comment.');
    } else if (!prNumber) {
      core.info('Not a pull request — skipping PR comment.');
    } else {
      await upsertStickyComment(
        octokit,
        { owner: ctx.repo.owner, repo: ctx.repo.repo, issueNumber: prNumber },
        inputs.commentMarker,
        markdown,
      );
    }
  }

  if (inputs.annotations && report.failedTests.length > 0) {
    if (!octokit) {
      core.warning('No token available — skipping check annotations.');
    } else {
      await postAnnotations(
        octokit,
        { owner: ctx.repo.owner, repo: ctx.repo.repo },
        inputs.checkName,
        headSha,
        report.failedTests,
      );
    }
  }

  core.info(
    `Tests: ${report.passed} passed, ${report.failed} failed, ${report.skipped} skipped, ${report.total} total.`,
  );

  if (inputs.failOnError && !report.success) {
    core.setFailed(`${report.failed} test${report.failed !== 1 ? 's' : ''} failed.`);
  }
}
