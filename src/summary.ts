/**
 * Writes the report Markdown to the Actions job summary.
 */
import * as core from '@actions/core';

export async function writeJobSummary(markdown: string): Promise<void> {
  await core.summary.addRaw(markdown).write();
}
