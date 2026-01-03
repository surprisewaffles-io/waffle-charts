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
