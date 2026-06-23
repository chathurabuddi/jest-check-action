/**
 * Inline check-run annotations on failing test lines. A dedicated check run
 * (named distinctly from the branch-protection job check) renders a red-X at
 * the exact failing line in the PR diff.
 *
 * The Checks API accepts at most 50 annotations per request, so the first 50
 * go in `checks.create` and any remainder are sent via `checks.update`.
 */
import * as core from '@actions/core';
import type { getOctokit } from '@actions/github';
import type { FailedTest } from '../types.js';

type Octokit = ReturnType<typeof getOctokit>;

const BATCH = 50;
const MAX_MESSAGE = 65535;

export interface RepoRef {
  owner: string;
  repo: string;
}

interface Annotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: 'failure';
  title: string;
  message: string;
}

/** Map failing tests to Checks API annotation objects. */
export function buildAnnotations(failedTests: FailedTest[]): Annotation[] {
  return failedTests.map((t) => ({
    path: t.file,
    start_line: t.line,
    end_line: t.line,
    annotation_level: 'failure',
    title: t.name,
    message: t.message.slice(0, MAX_MESSAGE),
  }));
}

/** Create the check run with failure annotations, batching past the API limit. */
export async function postAnnotations(
  octokit: Octokit,
  ref: RepoRef,
  checkName: string,
  headSha: string,
  failedTests: FailedTest[],
): Promise<void> {
  const annotations = buildAnnotations(failedTests);
  if (annotations.length === 0) return;

  const count = annotations.length;
  const output = {
    title: `${count} test failure${count !== 1 ? 's' : ''}`,
    summary: `${count} test${count !== 1 ? 's' : ''} failed`,
  };

  const { data: checkRun } = await octokit.rest.checks.create({
    owner: ref.owner,
    repo: ref.repo,
    name: checkName,
    head_sha: headSha,
    status: 'completed',
    conclusion: 'failure',
    output: { ...output, annotations: annotations.slice(0, BATCH) },
  });

  for (let i = BATCH; i < annotations.length; i += BATCH) {
    await octokit.rest.checks.update({
      owner: ref.owner,
      repo: ref.repo,
      check_run_id: checkRun.id,
      output: { ...output, annotations: annotations.slice(i, i + BATCH) },
    });
  }
  core.info(`Posted ${count} failure annotation${count !== 1 ? 's' : ''}.`);
}
