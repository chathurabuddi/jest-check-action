/**
 * Builds the Markdown report (used for both the sticky PR comment and the
 * Actions job summary) from a normalized {@link Report}. Pure — no I/O.
 *
 * Ported from the original `jest-pr.yml` github-script block, parameterized
 * by threshold and max-items.
 */
import {
  img,
  link,
  numBadge,
  pctBadge,
  pctColor,
  shield,
  statusBadge,
} from './badges.js';
import type { CoverageMetric, Report, RenderContext } from './types.js';

/** Escape a value for safe use inside a Markdown table cell. */
function cell(value: string): string {
  return value.replace(/\|/g, '\\|');
}

export function buildMarkdown(report: Report, ctx: RenderContext): string {
  const { serverUrl, repository, runId, headSha, coverageThreshold, maxItems } = ctx;
  const runUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;
  const commitUrl = `${serverUrl}/${repository}/commit/${headSha}`;
  const blobBase = `${serverUrl}/${repository}/blob/${headSha}/`;
  const commitShort = headSha.slice(0, 7) || 'unknown';
  const fileLink = (path: string): string =>
    `<a href="${blobBase}${path}">${path.split('/').pop()}</a>`;

  // ── header badges ──────────────────────────────────────────────────────
  const testBadge = report.success
    ? link(
        runUrl,
        img(
          shield('Tests', 'PASSED', '00C853', 'for-the-badge'),
          'Tests Passed',
          '&logo=jest&logoColor=white',
        ),
      )
    : link(
        runUrl,
        img(
          shield('Tests', 'FAILED', 'D50000', 'for-the-badge'),
          'Tests Failed',
          '&logo=jest&logoColor=white',
        ),
      );

  const covBadge =
    report.coverage !== null
      ? link(
          runUrl,
          img(
            shield(
              'Coverage',
              `${report.coverage.overall.toFixed(1)}%`,
              pctColor(report.coverage.overall, coverageThreshold),
              'for-the-badge',
            ),
            `Coverage ${report.coverage.overall.toFixed(1)}%`,
            '&logo=codecov&logoColor=white',
          ),
        )
      : '';

  const durBadge = link(
    runUrl,
    img(
      shield('Duration', `${report.duration}s`, '0288D1', 'for-the-badge'),
      `Duration ${report.duration}s`,
      '&logo=clockify&logoColor=white',
    ),
  );

  let md = `<div>\n${testBadge}\n${covBadge}\n${durBadge}\n</div>\n\n<br/>\n\n`;

  // ── test summary table ───────────────────────────────────────────────────
  md += `### 🧪 Test Run Summary\n\n`;
  md += `<table>\n`;
  md += `<tr>\n  <th align="center">Passed</th>\n  <th align="center">Failed</th>\n  <th align="center">Skipped</th>\n  <th align="center">Total</th>\n</tr>\n`;
  md += `<tr>\n`;
  md += `  <td align="center">${numBadge(report.passed, '00C853')}</td>\n`;
  md += `  <td align="center">${numBadge(report.failed, 'D50000')}</td>\n`;
  md += `  <td align="center">${numBadge(report.skipped, 'FFA000')}</td>\n`;
  md += `  <td align="center">${numBadge(report.total, '607D8B')}</td>\n`;
  md += `</tr>\n`;
  md += `</table>\n\n`;

  // ── coverage report ──────────────────────────────────────────────────────
  if (report.coverage) {
    const thr = `<code>${coverageThreshold}%</code>`;
    md += `### ☂️ Coverage Report\n\n`;
    md += `<table>\n`;
    md += `<tr><th align="left">Metric</th><th align="center">Coverage</th><th align="center">Threshold</th><th align="center">Status</th><th align="right">Uncovered Lines</th></tr>\n`;
    const rows: [string, CoverageMetric][] = [
      ['Statements', report.coverage.raw.statements],
      ['Branches', report.coverage.raw.branches],
      ['Functions', report.coverage.raw.functions],
      ['Lines', report.coverage.raw.lines],
    ];
    for (const [name, data] of rows) {
      const pct = typeof data.pct === 'number' ? data.pct : 0;
      const uncov = data.total - data.covered;
      md += `<tr>`;
      md += `<td>${name}</td>`;
      md += `<td align="center">${pctBadge(pct, coverageThreshold)}</td>`;
      md += `<td align="center">${thr}</td>`;
      md += `<td align="center">${statusBadge(pct, coverageThreshold)}</td>`;
      md += `<td align="right"><code>${uncov.toLocaleString()} / ${data.total.toLocaleString()}</code></td>`;
      md += `</tr>\n`;
    }
    md += `</table>\n\n`;

    // per-file breakdown
    const fileRows = report.belowThreshold.slice(0, maxItems);
    if (fileRows.length > 0) {
      const summaryText =
        report.belowThreshold.length > maxItems
          ? `${report.belowThreshold.length} files below threshold — click to expand worst ${maxItems}`
          : 'click to expand';
      md += `<details>\n<summary><b>Per-file Coverage Breakdown</b> &nbsp;—&nbsp; ${summaryText}</summary>\n<br/>\n\n`;
      md += `| File | Stmts | Branch | Funcs | Lines | Status |\n`;
      md += `|------|:-----:|:------:|:-----:|:-----:|:------:|\n`;
      for (const f of fileRows) {
        md += `| ${fileLink(f.file)} | ${pctBadge(f.statements, coverageThreshold)} | ${pctBadge(
          f.branches,
          coverageThreshold,
        )} | ${pctBadge(f.functions, coverageThreshold)} | ${pctBadge(
          f.lines,
          coverageThreshold,
        )} | ${statusBadge(f.min, coverageThreshold)} |\n`;
      }
      md += `\n</details>\n\n`;
    }
  }

  // ── failed tests ───────────────────────────────────────────────────────────
  if (report.failedTests.length > 0) {
    const shown = report.failedTests.slice(0, maxItems);
    const summary =
      report.failedTests.length > maxItems
        ? `${report.failedTests.length} failed — click to expand top ${maxItems} failures`
        : `${report.failedTests.length} failure${report.failedTests.length !== 1 ? 's' : ''}`;
    md += `<details>\n<summary><b>Failed Tests</b> &nbsp;—&nbsp; ${summary}</summary>\n<br/>\n\n`;
    for (const t of shown) {
      md += `**${t.name}** — ${fileLink(t.file)}\n\`\`\`\n${t.message}\n\`\`\`\n\n`;
    }
    md += `</details>\n\n`;
  }

  // ── skipped tests ──────────────────────────────────────────────────────────
  if (report.skippedTests.length > 0) {
    const shown = report.skippedTests.slice(0, maxItems);
    const summary =
      report.skippedTests.length > maxItems
        ? `${report.skippedTests.length} skipped — click to expand top ${maxItems}`
        : `${report.skippedTests.length} skipped`;
    md += `<details>\n<summary><b>Skipped Tests</b> &nbsp;—&nbsp; ${summary}</summary>\n<br/>\n\n`;
    md += `| Test | File | Reason |\n|------|------|--------|\n`;
    for (const t of shown) {
      md += `| ${cell(t.title)} | ${fileLink(t.file)} | \`${t.reason}\` |\n`;
    }
    md += `</details>\n\n`;
  }

  // ── footer ───────────────────────────────────────────────────────────────
  md += `<br/>\n`;
  md += `<div>\n<sub>\n`;
  md += `  ${link(
    runUrl,
    img(
      shield('Jest', report.jestVersion, '99425B', 'flat-square'),
      `Jest ${report.jestVersion}`,
      '&logo=jest&logoColor=white',
    ),
  )}\n`;
  md += `  &nbsp;\n  ${link(
    commitUrl,
    img(
      shield('Commit', commitShort, '24292F', 'flat-square'),
      `Commit ${commitShort}`,
      '&logo=github&logoColor=white',
    ),
  )}\n`;
  md += `</sub>\n</div>`;

  return md;
}
