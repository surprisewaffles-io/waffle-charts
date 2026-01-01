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
