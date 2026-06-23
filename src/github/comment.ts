/**
 * Sticky PR comment upsert. Finds a previously posted comment by its hidden
 * marker and updates it in place, otherwise creates a new one — so repeated
 * runs never spam the PR.
 */
import * as core from '@actions/core';
import type { getOctokit } from '@actions/github';

type Octokit = ReturnType<typeof getOctokit>;

export interface IssueRef {
  owner: string;
  repo: string;
  issueNumber: number;
}

/** Create or update the sticky comment identified by `marker`. */
export async function upsertStickyComment(
  octokit: Octokit,
  ref: IssueRef,
  marker: string,
  markdown: string,
): Promise<void> {
  const { owner, repo, issueNumber } = ref;
  const body = `${marker}\n${markdown}`;

  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  const existing = comments.find((c) => c.body?.startsWith(marker));

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
    core.info(`Updated sticky comment #${existing.id}.`);
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
    core.info('Created sticky comment.');
  }
}

/** Post a standalone fallback comment (used when results are missing). */
export async function postComment(
  octokit: Octokit,
  ref: IssueRef,
  body: string,
): Promise<void> {
  await octokit.rest.issues.createComment({
    owner: ref.owner,
    repo: ref.repo,
    issue_number: ref.issueNumber,
    body,
  });
}
