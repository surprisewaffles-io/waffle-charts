import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BarChart } from '../BarChart';

// 1. Mock ResizeObserver (Global)
class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
}
vi.stubGlobal('ResizeObserver', ResizeObserver);

// 2. Mock ParentSize
vi.mock('@visx/responsive', () => ({
  ParentSize: ({ children }: { children: (args: { width: number; height: number }) => React.ReactNode }) =>
    children({ width: 500, height: 300 }),
}));

const mockData = [
  { label: 'A', value: 101 },
  { label: 'B', value: 202 },
  { label: 'C', value: 303 },
];

describe('BarChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        xKey="label"
        yKey="value"
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders SVG elements', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        xKey="label"
        yKey="value"
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders correct number of bars', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        xKey="label"
        yKey="value"
      />
    );
    const bars = container.querySelectorAll('rect');
    expect(bars.length).toBeGreaterThanOrEqual(3);
  });

  it('applies custom bar color', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        xKey="label"
        yKey="value"
        barColor="fill-blue-500"
      />
    );
    const bars = container.querySelectorAll('rect');
    const hasBlueBar = Array.from(bars).some(bar => bar.classList.contains('fill-blue-500'));
    expect(hasBlueBar).toBe(true);
  });

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <BarChart
        data={mockData}
        xKey="label"
        yKey="value"
      />
    );

    const bars = container.querySelectorAll('rect');
    const firstBar = bars[0];

    // Interaction
    await user.hover(firstBar);

    // Assert
    // We look for "101" which is the value of the first bar.
    // This is unique enough and proves the tooltip is rendering with correct data.
    const tooltipValue = await screen.findByText('101');
    expect(tooltipValue).toBeVisible();
  });

  it('renders stacked bar chart', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        xKey="label"
        variant="stacked"
        keys={['value']}
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const bars = container.querySelectorAll('rect');
    expect(bars.length).toBeGreaterThan(0);
  });

  it('renders grouped bar chart', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        xKey="label"
        variant="grouped"
        keys={['value']}
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const bars = container.querySelectorAll('rect');
    expect(bars.length).toBeGreaterThan(0);
  });
});

describe('BarChart edge-case data', () => {
  // Callers in plain JS can pass anything; the assertion reproduces that
  // without weakening the component's own types.
  const asData = (value: unknown) => value as typeof mockData;

  it('renders a fallback instead of a chart when data is empty', () => {
    render(<BarChart data={[]} xKey="label" yKey="value" />);
    expect(screen.getByRole('status')).toHaveTextContent('No data to display');
  });

  it('renders a custom empty message when one is supplied', () => {
    render(<BarChart data={[]} xKey="label" yKey="value" emptyMessage="Nothing measured" />);
    expect(screen.getByRole('status')).toHaveTextContent('Nothing measured');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders the fallback when data is %s', (_label, value) => {
    render(<BarChart data={asData(value)} xKey="label" yKey="value" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback when every row has a non-numeric value', () => {
    render(<BarChart data={asData([{ label: 'A', value: 'nope' }])} xKey="label" yKey="value" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback for a stacked chart with no keys', () => {
    render(<BarChart data={mockData} xKey="label" variant="stacked" keys={[]} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback for an empty stacked chart', () => {
    render(<BarChart data={[]} xKey="label" variant="stacked" keys={['value']} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback for an empty grouped chart', () => {
    render(<BarChart data={[]} xKey="label" variant="grouped" keys={['value']} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a chart for a single data point', () => {
    const { container } = render(<BarChart data={[mockData[0]]} xKey="label" yKey="value" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('rect').length).toBeGreaterThan(0);
  });

  it('produces finite geometry rather than Infinity for a single point', () => {
    const { container } = render(<BarChart data={[mockData[0]]} xKey="label" yKey="value" />);
    expect(container.innerHTML).not.toMatch(/Infinity|NaN/);
  });

  it('keeps hook order stable when data arrives after an empty render', () => {
    const { container, rerender } = render(<BarChart data={[]} xKey="label" yKey="value" />);
    rerender(<BarChart data={mockData} xKey="label" yKey="value" />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(3);
  });
});
