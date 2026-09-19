import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ChordChart } from '../ChordChart';

// Mock ParentSize
vi.mock('@visx/responsive', () => ({
  ParentSize: ({ children }: { children: (args: { width: number; height: number }) => ReactNode }) =>
    children({ width: 800, height: 600 }),
}));

// Mock TooltipInPortal
vi.mock('@visx/tooltip', async () => {
  const actual = await vi.importActual('@visx/tooltip');
  return {
    ...actual,
    useTooltipInPortal: () => ({
      containerRef: () => { },
      TooltipInPortal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    }),
  };
});

const matrix = [
  [100, 50],
  [50, 100]
];
const keys = ['A', 'B'];

beforeAll(() => {
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    x: 0,
    y: 0,
    toJSON: () => { },
  }));
});

describe('ChordChart', () => {
  it('renders ribbons and arcs', () => {
    const { container } = render(<ChordChart data={matrix} keys={keys} />);

    // Arcs + Ribbons are paths
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);

    // Specifically arcs usually have a distinct class or attribute, 
    // but verifying we have paths (ribbons + arcs) confirms basic rendering.
  });

  it.skip('shows tooltip on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(<ChordChart data={matrix} keys={keys} />);

    // Find ribbons (paths inside the group)
    // Just hover the first path we find
    const paths = container.querySelectorAll('path');
    if (paths[0]) await user.hover(paths[0]);

    // Tooltip content: "A ↔ A" or similar
    // We expect at least some tooltip content to appear.
    // Given the matrix [100, 50], [50, 100]
    // A->A (100), A->B (50), B->A (50), B->B (100)
    // We can just check if ANY tooltip renders.

    // We need to wait for the tooltip
    // Use findBy to wait
    const tooltip = await screen.findByText(/Flow:/);
    expect(tooltip).toBeInTheDocument();
  });
});

/**
 * jsdom's selector engine matches `linearGradient` only as the rightmost part
 * of a selector, never as an ancestor: `defs linearGradient` finds the
 * gradients, but `linearGradient stop` returns nothing and would make an
 * assertion over the stops pass vacuously. So the gradients are selected first
 * and their stops read by scoping from the element. Real browsers do not need
 * this; do not fold these back into one selector.
 */
const gradientsIn = (container: Element) =>
  Array.from(container.querySelectorAll('defs linearGradient'));

const stopsOf = (gradient: Element) => Array.from(gradient.querySelectorAll('stop'));

/** Ribbons are the paths pointed at a gradient; the arcs keep a flat fill. */
const ribbonsIn = (container: Element) =>
  Array.from(container.querySelectorAll('path')).filter(p =>
    (p.getAttribute('fill') ?? '').startsWith('url('),
  );

describe('ChordChart ribbon gradients', () => {
  // One chord only, and its two ends sit on different groups, so each gradient
  // has two distinct colours to run between.
  const oneWayMatrix = [
    [0, 50],
    [20, 0],
  ];

  it('points every ribbon fill at a gradient defined in the same svg', () => {
    const { container } = render(<ChordChart data={matrix} keys={keys} />);
    const ribbons = ribbonsIn(container);

    expect(ribbons.length).toBeGreaterThan(0);
    for (const ribbon of ribbons) {
      const id = (ribbon.getAttribute('fill') ?? '').match(/^url\(#(.+)\)$/)?.[1];
      expect(id).toBeTruthy();
      expect(container.querySelector(`defs > linearGradient[id="${id}"]`)).not.toBeNull();
    }
  });

  it('runs each gradient from its source arc colour to its target arc colour', () => {
    const { container } = render(
      <ChordChart data={oneWayMatrix} keys={keys} colorScheme={['#111111', '#222222']} />,
    );
    const gradients = gradientsIn(container);

    expect(gradients).toHaveLength(1);
    const stopColors = stopsOf(gradients[0]).map(s => s.getAttribute('stop-color'));

    // Which end d3 calls the source depends on which cell is larger, so the
    // pair is compared as a set: what matters is that the two ends wear the
    // two groups' own colours rather than one colour twice.
    expect(new Set(stopColors)).toEqual(new Set(['#111111', '#222222']));
  });

  it('matches each ribbon end to the arc fill it meets', () => {
    const { container } = render(
      <ChordChart data={oneWayMatrix} keys={keys} colorScheme={['#111111', '#222222']} />,
    );

    const arcFills = Array.from(container.querySelectorAll('path'))
      .map(p => p.getAttribute('fill'))
      .filter(fill => fill && !fill.startsWith('url('));
    const stopColors = gradientsIn(container).flatMap(g =>
      stopsOf(g).map(s => s.getAttribute('stop-color')),
    );

    expect(stopColors).toHaveLength(2);
    for (const color of stopColors) {
      expect(arcFills).toContain(color);
    }
  });

  it('anchors each gradient to the two points the ribbon joins', () => {
    const { container } = render(<ChordChart data={oneWayMatrix} keys={keys} />);
    const [gradient] = gradientsIn(container);

    // userSpaceOnUse, because objectBoundingBox measures the ribbon's
    // axis-aligned bounding box and so points the fade along the wrong
    // diagonal for every chord that is not horizontal or vertical.
    expect(gradient.getAttribute('gradientUnits')).toBe('userSpaceOnUse');

    const coords = ['x1', 'y1', 'x2', 'y2'].map(a => Number(gradient.getAttribute(a)));
    expect(coords.every(Number.isFinite)).toBe(true);
    // The two ends sit on different arcs, so they cannot coincide.
    expect([coords[0], coords[1]]).not.toEqual([coords[2], coords[3]]);

    // Both ends lie on the inner circle the ribbons attach to: centre size 600,
    // padding 40, outer radius 260, inner radius 240.
    const radiusOf = (x: number, y: number) => Math.hypot(x, y);
    expect(radiusOf(coords[0], coords[1])).toBeCloseTo(240, 5);
    expect(radiusOf(coords[2], coords[3])).toBeCloseTo(240, 5);

    expect(stopsOf(gradient).map(s => s.getAttribute('offset'))).toEqual(['0%', '100%']);
  });

  it('keeps the existing ribbon opacity', () => {
    const { container } = render(<ChordChart data={matrix} keys={keys} />);

    for (const ribbon of ribbonsIn(container)) {
      expect(ribbon.getAttribute('fill-opacity')).toBe('0.75');
      expect(ribbon.getAttribute('opacity')).toBe('0.75');
    }
  });

  it('gives two charts on one page disjoint gradient ids', () => {
    // A shared id would make both charts resolve to whichever <defs> the
    // browser parsed first, so the second chart would wear the first's colours.
    const { container } = render(
      <>
        <ChordChart data={oneWayMatrix} keys={keys} colorScheme={['#111111', '#222222']} />
        <ChordChart data={oneWayMatrix} keys={keys} colorScheme={['#aaaaaa', '#bbbbbb']} />
      </>,
    );

    const ids = gradientsIn(container).map(g => g.getAttribute('id'));

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    // querySelector rejects the ':' useId embeds, so the ids must be stripped.
    for (const id of ids) {
      expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('renders a self-chord without NaN geometry', () => {
    // A group flowing to itself puts both gradient ends on the same arc, which
    // makes the vector degenerate rather than invalid.
    const { container } = render(<ChordChart data={[[10]]} keys={['A']} />);

    expect(gradientsIn(container)).toHaveLength(1);
    expect(container.innerHTML).not.toMatch(/NaN/);
  });
});

describe('ChordChart edge-case data', () => {
  // Callers in plain JS can pass anything; the assertion reproduces that
  // without weakening the component's own types.
  const asMatrix = (value: unknown) => value as number[][];

  it('renders a fallback instead of a chart when the matrix is empty', () => {
    render(<ChordChart data={[]} keys={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('No data to display');
  });

  it('renders a custom empty message when one is supplied', () => {
    render(<ChordChart data={[]} keys={[]} emptyMessage="No connections" />);
    expect(screen.getByRole('status')).toHaveTextContent('No connections');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders the fallback when data is %s', (_label, value) => {
    render(<ChordChart data={asMatrix(value)} keys={keys} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback when every cell is zero', () => {
    render(<ChordChart data={[[0, 0], [0, 0]]} keys={keys} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a chart for a single-group matrix', () => {
    const { container } = render(<ChordChart data={[[10]]} keys={['A']} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('pads a ragged matrix rather than producing NaN geometry', () => {
    const { container } = render(
      <ChordChart data={asMatrix([[100, 50], [50]])} keys={keys} />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/NaN/);
  });

  it('keeps hook order stable when data arrives after an empty render', () => {
    const { container, rerender } = render(<ChordChart data={[]} keys={[]} />);
    rerender(<ChordChart data={matrix} keys={keys} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
  });
});
