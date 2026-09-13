import { render, screen } from '@testing-library/react';
import { WaffleChart } from '../WaffleChart';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';

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
    children({ width: 500, height: 500 }),
}));

describe('WaffleChart', () => {
  const mockData = [
    { name: 'A', value: 30 },
    { name: 'B', value: 20 },
    { name: 'C', value: 50 },
  ];

  it('renders without crashing', () => {
    render(
      <WaffleChart
        data={mockData}
        labelKey="name"
        valueKey="value"
      />
    );
    // Should render SVG
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders correct number of cells', () => {
    // Default 10x10 = 100 cells
    const { container } = render(
      <WaffleChart
        data={mockData}
        labelKey="name"
        valueKey="value"
      />
    );
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(100);
  });

  it('shows tooltip on hover', async () => {
    render(
      <WaffleChart
        data={mockData}
        labelKey="name"
        valueKey="value"
      />
    );

    // Find a rect - we know the first few should be data 'A'
    const rects = document.querySelectorAll('rect');
    const firstRect = rects[0];

    await userEvent.hover(firstRect);

    // Assert tooltip content
    expect(await screen.findByText('A')).toBeInTheDocument();
    expect(await screen.findByText(/30/)).toBeInTheDocument();
  });
});

describe('WaffleChart edge-case data', () => {
  const mockData = [
    { name: 'A', value: 30 },
    { name: 'B', value: 20 },
    { name: 'C', value: 50 },
  ];

  // Callers in plain JS can pass anything; the assertion reproduces that
  // without weakening the component's own types.
  const asData = (value: unknown) => value as typeof mockData;

  it('renders a fallback instead of a chart when data is empty', () => {
    render(<WaffleChart data={[]} labelKey="name" valueKey="value" />);
    expect(screen.getByRole('status')).toHaveTextContent('No data to display');
  });

  it('renders a custom empty message when one is supplied', () => {
    render(<WaffleChart data={[]} labelKey="name" valueKey="value" emptyMessage="No shares" />);
    expect(screen.getByRole('status')).toHaveTextContent('No shares');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders the fallback when data is %s', (_label, value) => {
    render(<WaffleChart data={asData(value)} labelKey="name" valueKey="value" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback when every row has a non-numeric value', () => {
    render(
      <WaffleChart data={asData([{ name: 'A', value: 'lots' }])} labelKey="name" valueKey="value" />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a full grid for a single segment', () => {
    const { container } = render(
      <WaffleChart data={[mockData[0]]} labelKey="name" valueKey="value" />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(100);
  });

  it('produces finite geometry when every value is zero', () => {
    const { container } = render(
      <WaffleChart data={[{ name: 'A', value: 0 }]} labelKey="name" valueKey="value" />,
    );
    expect(container.innerHTML).not.toMatch(/Infinity|NaN/);
  });

  it('keeps hook order stable when data arrives after an empty render', () => {
    const { container, rerender } = render(
      <WaffleChart data={[]} labelKey="name" valueKey="value" />,
    );
    rerender(<WaffleChart data={mockData} labelKey="name" valueKey="value" />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(100);
  });
});
