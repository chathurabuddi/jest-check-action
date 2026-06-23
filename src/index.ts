/**
 * Action entrypoint. Kept intentionally thin and excluded from coverage; the
 * logic lives in {@link run}.
 */
import * as core from '@actions/core';
import { run } from './main.js';

/* istanbul ignore next */
run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
