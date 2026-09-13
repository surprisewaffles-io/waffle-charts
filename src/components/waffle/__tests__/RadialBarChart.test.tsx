import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { RadialBarChart } from '../RadialBarChart';

// Mock ResizeObserver
class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
}
vi.stubGlobal('ResizeObserver', ResizeObserver);

// Mock ParentSize
vi.mock('@visx/responsive', () => ({
  ParentSize: ({ children }: { children: (args: { width: number; height: number }) => React.ReactNode }) =>
    children({ width: 500, height: 300 }),
}));

const mockData = [
  { name: 'A', value: 100, fill: 'red' },
  { name: 'B', value: 50, fill: 'blue' },
];

describe('RadialBarChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <RadialBarChart
        data={mockData}
        valueKey="value"
        labelKey="name"
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders arcs (paths) for each data point', () => {
    const { container } = render(
      <RadialBarChart
        data={mockData}
        valueKey="value"
        labelKey="name"
      />
    );
    // RadialBarChart renders background arc + value arc for each item.
    // Total paths should be at least 2 * data.length
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(mockData.length * 2);
  });

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RadialBarChart
        data={mockData}
        valueKey="value"
        labelKey="name"
      />
    );

    // Target the value arcs. They usually have the fill color.
    // We can just try hovering over paths until we find one that triggers.
    // The component uses opacity and color scale.
    // Or we hover the SVG center if possible, but arcs are specific.
    const paths = container.querySelectorAll('path');

    // Attempt to hover the last path (usually drawn on top)
    const lastPath = paths[paths.length - 1];

    if (lastPath) {
      await user.hover(lastPath);
      // Depending on which one we hit (A or B), check for text.
      // Since it's radial, hitting the exact pixel in test environment can be tricky without precise coords.
      // However, userEvent.hover usually centers on the element.
      // Let's just check if *any* label appears.
      const labelVisible = (await screen.findAllByText(/A|B/)).length > 0;
      expect(labelVisible).toBe(true);
    }
  });
});

describe('RadialBarChart edge-case data', () => {
  // Callers in plain JS can pass anything; the assertion reproduces that
  // without weakening the component's own types.
  const asData = (value: unknown) => value as typeof mockData;

  it('renders a fallback instead of a chart when data is empty', () => {
    render(<RadialBarChart data={[]} valueKey="value" labelKey="name" />);
    expect(screen.getByRole('status')).toHaveTextContent('No data to display');
  });

  it('renders a custom empty message when one is supplied', () => {
    render(
      <RadialBarChart data={[]} valueKey="value" labelKey="name" emptyMessage="No rings" />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No rings');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders the fallback when data is %s', (_label, value) => {
    render(<RadialBarChart data={asData(value)} valueKey="value" labelKey="name" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback when every row has a non-numeric value', () => {
    render(
      <RadialBarChart
        data={asData([{ name: 'A', value: 'lots' }])}
        valueKey="value"
        labelKey="name"
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a chart for a single ring', () => {
    const { container } = render(
      <RadialBarChart data={[mockData[0]]} valueKey="value" labelKey="name" />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(2);
  });

  it('produces finite geometry when every value is zero', () => {
    const { container } = render(
      <RadialBarChart
        data={[{ name: 'A', value: 0, fill: 'red' }]}
        valueKey="value"
        labelKey="name"
      />,
    );
    expect(container.innerHTML).not.toMatch(/Infinity|NaN/);
  });

  it('keeps hook order stable when data arrives after an empty render', () => {
    const { container, rerender } = render(
      <RadialBarChart data={[]} valueKey="value" labelKey="name" />,
    );
    rerender(<RadialBarChart data={mockData} valueKey="value" labelKey="name" />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(4);
  });
});
