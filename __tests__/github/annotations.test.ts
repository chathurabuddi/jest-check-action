import { buildAnnotations, postAnnotations } from '../../src/github/annotations';
import type { FailedTest } from '../../src/types';

jest.mock('@actions/core');

const ref = { owner: 'o', repo: 'r' };

function fails(n: number): FailedTest[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `test ${i}`,
    file: 'src/x.test.js',
    message: 'msg',
    line: i + 1,
  }));
}

function makeOctokit() {
  const create = jest.fn().mockResolvedValue({ data: { id: 123 } });
  const update = jest.fn().mockResolvedValue({});
  return {
    octokit: {
      rest: { checks: { create, update } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    create,
    update,
  };
}

describe('buildAnnotations', () => {
  it('maps failed tests to annotation objects and truncates long messages', () => {
    const long: FailedTest = {
      name: 'n',
      file: 'f.js',
      message: 'x'.repeat(70000),
      line: 5,
    };
    const [a] = buildAnnotations([long]);
    expect(a).toMatchObject({
      path: 'f.js',
      start_line: 5,
      end_line: 5,
      annotation_level: 'failure',
      title: 'n',
    });
    expect(a.message.length).toBe(65535);
  });
});

describe('postAnnotations', () => {
  it('does nothing when there are no failed tests', async () => {
    const { octokit, create } = makeOctokit();
    await postAnnotations(octokit, ref, 'Jest Failures', 'sha', []);
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a single check run for up to 50 annotations', async () => {
    const { octokit, create, update } = makeOctokit();
    await postAnnotations(octokit, ref, 'Jest Failures', 'sha', fails(50));
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].output.annotations).toHaveLength(50);
    expect(create.mock.calls[0][0].output.title).toBe('50 test failures');
    expect(update).not.toHaveBeenCalled();
  });

  it('batches annotations beyond 50 into update calls', async () => {
    const { octokit, create, update } = makeOctokit();
    await postAnnotations(octokit, ref, 'Jest Failures', 'sha', fails(120));
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(2); // 50..100, 100..120
    expect(update.mock.calls[1][0].output.annotations).toHaveLength(20);
  });

  it('uses singular wording for a single failure', async () => {
    const { octokit, create } = makeOctokit();
    await postAnnotations(octokit, ref, 'Jest Failures', 'sha', fails(1));
    expect(create.mock.calls[0][0].output.title).toBe('1 test failure');
  });
});
