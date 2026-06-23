import { upsertStickyComment, postComment } from '../../src/github/comment';

jest.mock('@actions/core');

const MARKER = '<!-- jest-pr-reporter -->';
const ref = { owner: 'o', repo: 'r', issueNumber: 7 };

function makeOctokit(comments: Array<{ id: number; body: string }>) {
  const listComments = jest.fn();
  const updateComment = jest.fn().mockResolvedValue({});
  const createComment = jest.fn().mockResolvedValue({});
  const paginate = jest.fn().mockResolvedValue(comments);
  return {
    octokit: {
      paginate,
      rest: { issues: { listComments, updateComment, createComment } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    updateComment,
    createComment,
    paginate,
  };
}

describe('upsertStickyComment', () => {
  it('updates an existing comment identified by the marker', async () => {
    const { octokit, updateComment, createComment } = makeOctokit([
      { id: 99, body: `${MARKER}\nold` },
    ]);
    await upsertStickyComment(octokit, ref, MARKER, 'new body');
    expect(updateComment).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 99, body: `${MARKER}\nnew body` }),
    );
    expect(createComment).not.toHaveBeenCalled();
  });

  it('creates a new comment when none match the marker', async () => {
    const { octokit, updateComment, createComment } = makeOctokit([
      { id: 1, body: 'unrelated' },
    ]);
    await upsertStickyComment(octokit, ref, MARKER, 'body');
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({ issue_number: 7, body: `${MARKER}\nbody` }),
    );
    expect(updateComment).not.toHaveBeenCalled();
  });
});

describe('postComment', () => {
  it('creates a standalone comment', async () => {
    const { octokit, createComment } = makeOctokit([]);
    await postComment(octokit, ref, 'hi');
    expect(createComment).toHaveBeenCalledWith({
      owner: 'o',
      repo: 'r',
      issue_number: 7,
      body: 'hi',
    });
  });
});
