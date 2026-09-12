import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { HeatmapChart } from '../HeatmapChart';

// Mocks
class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
}
vi.stubGlobal('ResizeObserver', ResizeObserver);

vi.mock('@visx/responsive', () => ({
  ParentSize: ({ children }: { children: (args: { width: number; height: number }) => React.ReactNode }) =>
    children({ width: 500, height: 300 }),
}));

// Mock data: 2 columns, each with 2 rows = 4 cells
const mockData = [
  { bin: 0, bins: [{ bin: 0, count: 10 }, { bin: 1, count: 20 }] },
  { bin: 1, bins: [{ bin: 0, count: 30 }, { bin: 1, count: 40 }] }
];

describe('HeatmapChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <HeatmapChart data={mockData} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders correct number of cells', () => {
    const { container } = render(
      <HeatmapChart data={mockData} />
    );
    // We expect 4 rects (2x2)
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(4);
  });

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <HeatmapChart data={mockData} />
    );

    const rects = container.querySelectorAll('rect');
    // Hover first cell (count 10)
    await user.hover(rects[0]);

    // Expect tooltip with value "10"
    const tooltip = await screen.findByText('Value: 10');
    expect(tooltip).toBeVisible();
  });
});

describe('HeatmapChart edge-case data', () => {
  // Callers in plain JS can pass anything; the double assertion reproduces
  // that without weakening the component's own types.
  const asData = (value: unknown) => value as typeof mockData;

  it('renders a fallback instead of a chart when data is empty', () => {
    render(<HeatmapChart data={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('No data to display');
  });

  it('renders a custom empty message when one is supplied', () => {
    render(<HeatmapChart data={[]} emptyMessage="No activity recorded" />);
    expect(screen.getByRole('status')).toHaveTextContent('No activity recorded');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders the fallback when data is %s', (_label, value) => {
    render(<HeatmapChart data={asData(value)} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback when every column has empty or missing bins', () => {
    render(
      <HeatmapChart
        data={asData([{ bin: 0, bins: [] }, { bin: 1, bins: undefined }])}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a single cell for a one-column, one-bin dataset', () => {
    const { container } = render(
      <HeatmapChart data={[{ bin: 0, bins: [{ bin: 0, count: 5 }] }]} />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('rect').length).toBe(1);
  });

  it('gives cells a finite width rather than Infinity for a single column', () => {
    const { container } = render(
      <HeatmapChart data={[{ bin: 0, bins: [{ bin: 0, count: 5 }] }]} />,
    );
    const width = container.querySelector('rect')?.getAttribute('width');
    expect(Number(width)).toBeGreaterThan(0);
    expect(Number.isFinite(Number(width))).toBe(true);
  });

  it('keeps hook order stable when data arrives after an empty render', () => {
    const { container, rerender } = render(<HeatmapChart data={[]} />);
    rerender(<HeatmapChart data={mockData} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('rect').length).toBe(4);
  });
});
