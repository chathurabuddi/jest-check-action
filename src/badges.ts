/**
 * Pure shields.io badge URL builders, ported from the original
 * `jest-pr.yml` github-script block. No I/O — trivially unit-testable.
 */

/** Encode a badge segment per shields.io escaping rules. */
export function encodeSegment(value: string | number): string {
  return String(value)
    .replace(/%/g, '%25')
    .replace(/-/g, '--')
    .replace(/_/g, '__')
    .replace(/ /g, '%20');
}

/** Two-part badge: `/badge/{label}-{value}-{color}`. */
export function shield(
  label: string,
  value: string | number,
  color: string,
  style = 'flat-square',
): string {
  return `https://img.shields.io/badge/${encodeSegment(label)}-${encodeSegment(
    value,
  )}-${color}?style=${style}`;
}

/** Single-value badge: `/badge/{value}-{color}`. */
export function valShield(value: string | number, color: string, style = 'flat'): string {
  return `https://img.shields.io/badge/${encodeSegment(value)}-${color}?style=${style}`;
}

/** `<img>` tag with optional query-string extras (e.g. `&logo=jest`). */
export function img(url: string, alt: string, extra = ''): string {
  return `<img src="${url}${extra}" alt="${alt}"/>`;
}

/** `<a>` wrapper. */
export function link(href: string, content: string): string {
  return `<a href="${href}">${content}</a>`;
}

/** Threshold-aware colour: green at/above threshold, yellow above 60% of it, red below. */
export function pctColor(pct: number, threshold: number): string {
  const warn = threshold * 0.75;
  if (pct >= threshold) return '3DDC84';
  if (pct >= warn) return 'FFA000';
  return 'D50000';
}

/** A percentage badge such as `75.0%` coloured by threshold. */
export function pctBadge(pct: number, threshold: number): string {
  return img(
    valShield(`${pct.toFixed(1)}%`, pctColor(pct, threshold)),
    `${pct.toFixed(1)}%`,
  );
}

/** PASS / WARN / FAIL status badge keyed off the threshold. */
export function statusBadge(pct: number, threshold: number): string {
  const warn = threshold * 0.75;
  if (pct >= threshold)
    return img(valShield('PASS', '00C853') + '&logoColor=white', 'PASS');
  if (pct >= warn) return img(valShield('WARN', 'FFA000') + '&logoColor=white', 'WARN');
  return img(valShield('FAIL', 'D50000') + '&logoColor=white', 'FAIL');
}

/** A plain coloured number badge (test counts). */
export function numBadge(n: number, color: string): string {
  return img(valShield(String(n), color), String(n));
}
