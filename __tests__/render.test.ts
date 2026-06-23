import { buildMarkdown } from '../src/render';
import type { Report, RenderContext } from '../src/types';

const ctx: RenderContext = {
  serverUrl: 'https://github.com',
  repository: 'o/r',
  runId: '42',
  headSha: 'abcdef1234567890',
  coverageThreshold: 80,
  maxItems: 2,
};

function baseReport(overrides: Partial<Report> = {}): Report {
  return {
    passed: 2,
    failed: 0,
    skipped: 0,
    total: 2,
    success: true,
    duration: '1.5',
    coverage: null,
    belowThreshold: [],
    failedTests: [],
    skippedTests: [],
    jestVersion: '29.7.0',
    ...overrides,
  };
}

const coverage: Report['coverage'] = {
  statements: 50,
  branches: 0,
  functions: 66.66,
  lines: 75,
  overall: 47.915,
  raw: {
    statements: { total: 6, covered: 3, skipped: 0, pct: 50 },
    branches: { total: 2, covered: 0, skipped: 0, pct: 0 },
    functions: { total: 3, covered: 2, skipped: 0, pct: 66.66 },
    lines: { total: 4, covered: 3, skipped: 0, pct: 75 },
  },
};

describe('buildMarkdown header', () => {
  it('renders a PASSED badge and run link on success', () => {
    const md = buildMarkdown(baseReport(), ctx);
    expect(md).toContain('Tests-PASSED-00C853');
    expect(md).toContain('actions/runs/42');
  });

  it('renders a FAILED badge on failure', () => {
    const md = buildMarkdown(baseReport({ success: false }), ctx);
    expect(md).toContain('Tests-FAILED-D50000');
  });

  it('omits the coverage badge when coverage is absent', () => {
    const md = buildMarkdown(baseReport(), ctx);
    expect(md).not.toContain('Coverage-');
  });

  it('includes the coverage badge when coverage is present', () => {
    const md = buildMarkdown(baseReport({ coverage }), ctx);
    expect(md).toContain('Coverage-');
  });

  it('falls back to "unknown" commit when headSha is empty', () => {
    const md = buildMarkdown(baseReport(), { ...ctx, headSha: '' });
    expect(md).toContain('Commit-unknown');
  });
});

describe('buildMarkdown coverage section', () => {
  it('renders all four metric rows with uncovered counts', () => {
    const md = buildMarkdown(baseReport({ coverage }), ctx);
    expect(md).toContain('Statements');
    expect(md).toContain('Branches');
    expect(md).toContain('Functions');
    expect(md).toContain('Lines');
    expect(md).toContain('3 / 6'); // statements uncovered
  });

  it('coerces an "Unknown" metric pct to zero', () => {
    const cov = {
      ...coverage,
      raw: {
        ...coverage.raw,
        branches: { total: 0, covered: 0, skipped: 0, pct: 'Unknown' as const },
      },
    };
    const md = buildMarkdown(baseReport({ coverage: cov }), ctx);
    expect(md).toContain('0.0%25-D50000'); // 0% rendered red
  });

  it('renders a per-file breakdown with overflow text when above maxItems', () => {
    const belowThreshold = Array.from({ length: 3 }, (_, i) => ({
      file: `src/f${i}.js`,
      statements: 10,
      branches: 10,
      functions: 10,
      lines: 10,
      min: 10,
    }));
    const md = buildMarkdown(baseReport({ coverage, belowThreshold }), ctx);
    expect(md).toContain('3 files below threshold — click to expand worst 2');
    expect(md).toContain('f0.js');
    expect(md).not.toContain('f2.js'); // capped at maxItems = 2
  });

  it('renders a per-file breakdown with plain text at or below maxItems', () => {
    const belowThreshold = [
      {
        file: 'src/one.js',
        statements: 10,
        branches: 10,
        functions: 10,
        lines: 10,
        min: 10,
      },
    ];
    const md = buildMarkdown(baseReport({ coverage, belowThreshold }), ctx);
    expect(md).toContain('click to expand</summary>');
  });

  it('omits the breakdown when no files are below threshold', () => {
    const md = buildMarkdown(baseReport({ coverage }), ctx);
    expect(md).not.toContain('Per-file Coverage Breakdown');
  });
});

describe('buildMarkdown failed tests section', () => {
  const mkFails = (n: number): Report['failedTests'] =>
    Array.from({ length: n }, (_, i) => ({
      name: `test ${i}`,
      file: 'src/x.test.js',
      message: 'boom',
      line: i + 1,
    }));

  it('renders a singular failure label for one failure', () => {
    const md = buildMarkdown(
      baseReport({ success: false, failedTests: mkFails(1) }),
      ctx,
    );
    expect(md).toContain('1 failure');
    expect(md).not.toContain('1 failures');
  });

  it('renders a plural failure label for multiple failures within cap', () => {
    const md = buildMarkdown(
      baseReport({ success: false, failedTests: mkFails(2) }),
      ctx,
    );
    expect(md).toContain('2 failures');
  });

  it('renders overflow text and caps failures at maxItems', () => {
    const md = buildMarkdown(
      baseReport({ success: false, failedTests: mkFails(3) }),
      ctx,
    );
    expect(md).toContain('3 failed — click to expand top 2 failures');
    expect(md).toContain('test 0');
    expect(md).not.toContain('test 2');
  });
});

describe('buildMarkdown skipped tests section', () => {
  const mkSkips = (n: number): Report['skippedTests'] =>
    Array.from({ length: n }, (_, i) => ({
      title: `skip | ${i}`,
      file: 'src/x.test.js',
      reason: 'skip' as const,
    }));

  it('renders skipped count and escapes pipe characters in titles', () => {
    const md = buildMarkdown(baseReport({ skippedTests: mkSkips(1) }), ctx);
    expect(md).toContain('1 skipped');
    expect(md).toContain('skip \\| 0');
  });

  it('renders overflow text and caps skipped at maxItems', () => {
    const md = buildMarkdown(baseReport({ skippedTests: mkSkips(3) }), ctx);
    expect(md).toContain('3 skipped — click to expand top 2');
  });

  it('omits the section when there are no skipped tests', () => {
    const md = buildMarkdown(baseReport(), ctx);
    expect(md).not.toContain('Skipped Tests');
  });
});

describe('buildMarkdown footer', () => {
  it('links the Jest version and commit', () => {
    const md = buildMarkdown(baseReport(), ctx);
    expect(md).toContain('Jest-29.7.0');
    expect(md).toContain('Commit-abcdef1');
    expect(md).toContain('commit/abcdef1234567890');
  });
});
