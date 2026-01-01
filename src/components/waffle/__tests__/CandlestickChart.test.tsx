import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { CandlestickChart } from '../CandlestickChart';

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
  { date: new Date('2024-01-01'), open: 100, high: 110, low: 90, close: 105 },
  { date: new Date('2024-01-02'), open: 105, high: 115, low: 100, close: 102 },
];

describe('CandlestickChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <CandlestickChart
        data={mockData}
        xKey="date"
        openKey="open"
        highKey="high"
        lowKey="low"
        closeKey="close"
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders SVG elements', () => {
    const { container } = render(
      <CandlestickChart
        data={mockData}
        xKey="date"
        openKey="open"
        highKey="high"
        lowKey="low"
        closeKey="close"
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders correct number of "candles" (groups)', () => {
    const { container } = render(
      <CandlestickChart
        data={mockData}
        xKey="date"
        openKey="open"
        highKey="high"
        lowKey="low"
        closeKey="close"
      />
    );
    // Each candle is a Group containing a Line (wick) and Rect (body)
    // We can count the rects that serve as bodies.
    // However, Axis might also have lines/rects.
    // The easiest way is to look for the groups with specific keys or just assume simple DOM structure.
    // Our implementation uses <Group key={candle-i}>
    // Checking for rect elements is usually safe if we subtract axis elements if needed, 
    // but standard axes don't use rects often (except maybe background). 
    // Let's count rects with class 'cursor-pointer' which we added.
    const bodies = container.querySelectorAll('rect.cursor-pointer');
    expect(bodies.length).toBe(mockData.length);
  });

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CandlestickChart
        data={mockData}
        xKey="date"
        openKey="open"
        highKey="high"
        lowKey="low"
        closeKey="close"
      />
    );

    const bodies = container.querySelectorAll('rect.cursor-pointer');
    const firstBody = bodies[0];

    // Interaction
    await user.hover(firstBody);

    // Assert
    // We look for values in the tooltip. Open: 100, Close: 105
    const openValue = await screen.findByText('100.00');
    expect(openValue).toBeVisible();
    const closeValue = await screen.findByText('105.00');
    expect(closeValue).toBeVisible();
  });
});
