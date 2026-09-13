import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ScatterChart } from '../ScatterChart';

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

const mockData = [
  { x: 10, y: 55 },
  { x: 20, y: 66 },
];

describe('ScatterChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ScatterChart
        data={mockData}
        xKey="x"
        yKey="y"
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('applies custom point class', () => {
    const { container } = render(
      <ScatterChart
        data={mockData}
        xKey="x"
        yKey="y"
        pointClassName="fill-purple-500"
      />
    );
    const circles = container.querySelectorAll('circle');
    // Check if any circle has the class
    const hasPurple = Array.from(circles).some(c => c.classList.contains('fill-purple-500'));
    expect(hasPurple).toBe(true);
  });

  it('shows tooltip on point hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ScatterChart
        data={mockData}
        xKey="x"
        yKey="y"
      />
    );

    const circles = container.querySelectorAll('circle');
    // Hover the first circle (x:10, y:55)
    await user.hover(circles[0]);

    // Tooltip should show 55
    const tooltipValue = await screen.findByText("55");
    expect(tooltipValue).toBeVisible();
  });
});

describe('ScatterChart edge-case data', () => {
  // Callers in plain JS can pass anything; the assertion reproduces that
  // without weakening the component's own types.
  const asData = (value: unknown) => value as typeof mockData;

  it('renders a fallback instead of a chart when data is empty', () => {
    render(<ScatterChart data={[]} xKey="x" yKey="y" />);
    expect(screen.getByRole('status')).toHaveTextContent('No data to display');
  });

  it('renders a custom empty message when one is supplied', () => {
    render(<ScatterChart data={[]} xKey="x" yKey="y" emptyMessage="Nothing plotted yet" />);
    expect(screen.getByRole('status')).toHaveTextContent('Nothing plotted yet');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders the fallback when data is %s', (_label, value) => {
    render(<ScatterChart data={asData(value)} xKey="x" yKey="y" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback when every row has a non-numeric coordinate', () => {
    render(<ScatterChart data={asData([{ x: 'abc', y: 'def' }])} xKey="x" yKey="y" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a chart for a single data point', () => {
    const { container } = render(<ScatterChart data={[mockData[0]]} xKey="x" yKey="y" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(0);
  });

  it('produces finite geometry rather than Infinity for a single point', () => {
    const { container } = render(<ScatterChart data={[mockData[0]]} xKey="x" yKey="y" />);
    expect(container.innerHTML).not.toMatch(/Infinity|NaN/);
  });

  it('keeps hook order stable when data arrives after an empty render', () => {
    const { container, rerender } = render(<ScatterChart data={[]} xKey="x" yKey="y" />);
    rerender(<ScatterChart data={mockData} xKey="x" yKey="y" />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('circle').length).toBe(2);
  });
});
