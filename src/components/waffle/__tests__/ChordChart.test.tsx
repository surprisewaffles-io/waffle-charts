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
