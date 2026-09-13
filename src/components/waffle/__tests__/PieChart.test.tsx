import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { PieChart } from '../PieChart';

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
  { label: 'Slice A', value: 100 },
  { label: 'Slice B', value: 200 },
];

describe('PieChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <PieChart
        data={mockData}
        labelKey="label"
        valueKey="value"
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders donut text when provided', () => {
    render(
      <PieChart
        data={mockData}
        labelKey="label"
        valueKey="value"
        innerRadius={50}
        centerText={{ title: "Donut", subtitle: "Chart" }}
      />
    );
    expect(screen.getByText("Donut")).toBeInTheDocument();
    expect(screen.getByText("Chart")).toBeInTheDocument();
  });

  it('shows tooltip on slice hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PieChart
        data={mockData}
        labelKey="label"
        valueKey="value"
      />
    );

    // Pie slices are paths
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2);

    // Hover first slice
    await user.hover(paths[0]);

    // Tooltip should contain label or value
    // Expect 'Slice A' or '100'
    const tooltipValue = await screen.findByText('100');
    expect(tooltipValue).toBeVisible();
  });
});

describe('PieChart edge-case data', () => {
  // Callers in plain JS can pass anything; the assertion reproduces that
  // without weakening the component's own types.
  const asData = (value: unknown) => value as typeof mockData;

  it('renders a fallback instead of a chart when data is empty', () => {
    render(<PieChart data={[]} labelKey="label" valueKey="value" />);
    expect(screen.getByRole('status')).toHaveTextContent('No data to display');
  });

  it('renders a custom empty message when one is supplied', () => {
    render(
      <PieChart data={[]} labelKey="label" valueKey="value" emptyMessage="No slices" />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No slices');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders the fallback when data is %s', (_label, value) => {
    render(<PieChart data={asData(value)} labelKey="label" valueKey="value" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback when every slice value is zero', () => {
    render(
      <PieChart data={[{ label: 'Slice A', value: 0 }]} labelKey="label" valueKey="value" />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a chart for a single slice', () => {
    const { container } = render(
      <PieChart data={[mockData[0]]} labelKey="label" valueKey="value" />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(1);
  });

  it('drops a non-numeric slice rather than producing NaN geometry', () => {
    const { container } = render(
      <PieChart
        data={asData([{ label: 'Slice A', value: 100 }, { label: 'Bad', value: 'x' }])}
        labelKey="label"
        valueKey="value"
      />,
    );
    expect(container.innerHTML).not.toMatch(/NaN/);
  });

  it('keeps hook order stable when data arrives after an empty render', () => {
    const { container, rerender } = render(
      <PieChart data={[]} labelKey="label" valueKey="value" />,
    );
    rerender(<PieChart data={mockData} labelKey="label" valueKey="value" />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(2);
  });
});
