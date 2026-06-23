import {
  encodeSegment,
  shield,
  valShield,
  img,
  link,
  pctColor,
  pctBadge,
  statusBadge,
  numBadge,
} from '../src/badges';

describe('encodeSegment', () => {
  it('escapes shields.io special characters', () => {
    expect(encodeSegment('a-b_c d%e')).toBe('a--b__c%20d%25e');
  });

  it('coerces numbers to strings', () => {
    expect(encodeSegment(42)).toBe('42');
  });
});

describe('shield', () => {
  it('builds a two-part badge with default style', () => {
    expect(shield('Tests', 'PASSED', '00C853')).toBe(
      'https://img.shields.io/badge/Tests-PASSED-00C853?style=flat-square',
    );
  });

  it('honours a custom style', () => {
    expect(shield('A', 'B', 'fff', 'for-the-badge')).toContain('style=for-the-badge');
  });
});

describe('valShield', () => {
  it('builds a single-value badge', () => {
    expect(valShield('75.0%', 'D50000')).toBe(
      'https://img.shields.io/badge/75.0%25-D50000?style=flat',
    );
  });

  it('honours a custom style', () => {
    expect(valShield('X', 'fff', 'plastic')).toContain('style=plastic');
  });
});

describe('img and link', () => {
  it('wraps a url in an img tag with extras', () => {
    expect(img('http://x', 'alt', '&logo=jest')).toBe(
      '<img src="http://x&logo=jest" alt="alt"/>',
    );
  });

  it('defaults extras to empty', () => {
    expect(img('http://x', 'alt')).toBe('<img src="http://x" alt="alt"/>');
  });

  it('wraps content in an anchor', () => {
    expect(link('http://x', 'c')).toBe('<a href="http://x">c</a>');
  });
});

describe('pctColor', () => {
  it('is green at or above threshold', () => {
    expect(pctColor(80, 80)).toBe('3DDC84');
    expect(pctColor(95, 80)).toBe('3DDC84');
  });

  it('is yellow in the warn band', () => {
    expect(pctColor(60, 80)).toBe('FFA000');
  });

  it('is red below the warn band', () => {
    expect(pctColor(59, 80)).toBe('D50000');
  });
});

describe('pctBadge', () => {
  it('formats to one decimal and colours by threshold (warn band)', () => {
    expect(pctBadge(75, 80)).toContain('75.0%25-FFA000');
  });

  it('colours below the warn band red', () => {
    expect(pctBadge(40, 80)).toContain('40.0%25-D50000');
  });
});

describe('statusBadge', () => {
  it('renders PASS at/above threshold', () => {
    expect(statusBadge(80, 80)).toContain('PASS');
  });

  it('renders WARN in the warn band', () => {
    expect(statusBadge(70, 80)).toContain('WARN');
  });

  it('renders FAIL below the warn band', () => {
    expect(statusBadge(10, 80)).toContain('FAIL');
  });
});

describe('numBadge', () => {
  it('renders a coloured number', () => {
    expect(numBadge(5, '00C853')).toContain('badge/5-00C853');
  });
});
