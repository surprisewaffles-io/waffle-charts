/**
 * Why: WCAG 2.1 SC 1.4.11 (Non-text Contrast, Level AA) requires a focus
 * indicator to reach 3:1 against what sits behind it. The library ships one
 * default focus colour per theme, and "looks blue enough" is not a check. A
 * later palette tweak that quietly drops the ring below the threshold should
 * fail here rather than in an audit.
 *
 * What: reads the two `--waffle-focus-color` values and the two background
 * colours out of `src/index.css` and computes the real ratio for each pairing,
 * so the assertion tracks the stylesheet instead of a copy of it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Read rather than import: vitest runs with `css: false`, which stubs every
// CSS import — `?raw` included — to an empty string. The path is resolved from
// the working directory because vitest's `import.meta.url` is a dev-server URL,
// not a file: one.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** Channel luminance per WCAG 2.1 relative-luminance definition. */
const channel = (value: number): number => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = ([r, g, b]: [number, number, number]): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const contrastRatio = (a: [number, number, number], b: [number, number, number]): number => {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const parseHex = (hex: string): [number, number, number] => {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
};

/** Converts the `H S% L%` triple shadcn stores in a CSS variable to RGB. */
const parseHsl = (triple: string): [number, number, number] => {
  const [h, s, l] = triple.trim().split(/\s+/).map(part => Number.parseFloat(part));
  const saturation = s / 100;
  const lightness = l / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  const sextant = Math.floor(h / 60) % 6;
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sextant];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
};

/** Reads one declaration out of the `:root` or `.dark` block. */
const declaration = (block: 'root' | 'dark', property: string): string => {
  const opener = block === 'root' ? ':root' : '\\.dark';
  const body = new RegExp(`${opener}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`).exec(css)?.[1];
  expect(body, `no ${block} block in index.css`).toBeDefined();
  const match = new RegExp(`--${property}:\\s*([^;]+);`).exec(body!);
  expect(match, `no --${property} in the ${block} block`).not.toBeNull();
  return match![1].trim();
};

describe('focus indicator contrast (WCAG 1.4.11)', () => {
  it.each([
    ['light', 'root' as const],
    ['dark', 'dark' as const],
  ])('reaches 3:1 against the %s background', (_theme, block) => {
    const focus = parseHex(declaration(block, 'waffle-focus-color'));
    const background = parseHsl(declaration(block, 'background'));
    expect(contrastRatio(focus, background)).toBeGreaterThanOrEqual(3);
  });

  it('computes known ratios correctly', () => {
    // Black on white is the definitional maximum, 21:1.
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    // A colour against itself is 1:1, which is what a broken parser would
    // report for every pairing above.
    expect(contrastRatio([100, 181, 255], [100, 181, 255])).toBeCloseTo(1, 5);
  });

  it('reads the two themes as different colours', () => {
    expect(declaration('root', 'waffle-focus-color')).not.toBe(
      declaration('dark', 'waffle-focus-color'),
    );
  });
});
