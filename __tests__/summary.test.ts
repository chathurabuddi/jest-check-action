import * as core from '@actions/core';
import { writeJobSummary } from '../src/summary';

jest.mock('@actions/core');

describe('writeJobSummary', () => {
  it('appends the markdown and writes the summary', async () => {
    const addRaw = jest.fn().mockReturnThis();
    const write = jest.fn().mockResolvedValue(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (core as any).summary = { addRaw, write };

    await writeJobSummary('# report');

    expect(addRaw).toHaveBeenCalledWith('# report');
    expect(write).toHaveBeenCalled();
  });
});
