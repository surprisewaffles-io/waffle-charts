import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { LineChart } from '../LineChart';

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
  { date: '2024-01-01', value: 100 },
  { date: '2024-01-02', value: 200 },
  { date: '2024-01-03', value: 300 },
];

describe('LineChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        xKey="date"
        yKey="value"
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders basic SVG structure', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        xKey="date"
        yKey="value"
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const path = container.querySelector('path'); // LinePath renders a path
    expect(path).toBeInTheDocument();
  });

  it('applies custom line color', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        xKey="date"
        yKey="value"
        lineColor="stroke-red-500"
      />
    );
    // LinePath is a path element. 
    // We look for a path that has this class.
    // There might be multiple paths (Grid, Area), so we check if *any* has it.
    const paths = container.querySelectorAll('path');
    const hasRedLine = Array.from(paths).some(p => p.classList.contains('stroke-red-500'));
    expect(hasRedLine).toBe(true);
  });

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LineChart
        data={mockData}
        xKey="date"
        yKey="value"
      />
    );

    // LineChart uses a transparent <rect> overlay for tooltips.
    // It's likely the last <rect> in the group or one that has 'transparent' fill.
    // We can try hovering over the SVG or finding the rect.
    // Since the overlay covers the chart area, hovering the center of the chart works.

    // Hovering the SVG might not trigger the specific rect listener if relying on bubbling, 
    // but Visx Bar wrapper usually handles standard events.
    // Let's target the rects.
    const rects = container.querySelectorAll('rect');
    // The one with "fill: transparent" is likely the overlay. 
    const overlay = Array.from(rects).find(r => r.getAttribute('fill') === 'transparent');

    if (overlay) {
      await user.hover(overlay);
      // Verify tooltip content. The tooltip displays yKey values.
      // We might hit any point depending on where 'hover' lands (defaults to center usually).
      // Center of 3 points (01, 02, 03) is likely 02 -> value 200.
      // But strict coordinate reliance is flaky.
      // Let's just check if *any* of the values appear.
      const valueVisible =
        (await screen.findAllByText(/100|200|300/)).length > 0;

      expect(valueVisible).toBe(true);
    } else {
      // Fallback if we can't find overlay (shouldn't happen with Visx architecture)
      throw new Error("Could not find overlay rect for interaction");
    }
  });
  it('renders multiple lines when series prop is provided', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        xKey="date"
        series={[
          { key: 'value', color: 'red' },
          { key: 'value2' as any, color: 'blue' }
        ]}
      />
    );
    // Should render multiple paths (one for each series + potentially others like grid)
    // Minimally we check that it doesn't crash and renders SVG
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // We can check for the legend items (w-2.5 h-2.5 from implementation)
    // Using partial match on class or just counting items in legend container
    // Let's find the legend container first if possible, or search by class
    const legendItems = container.querySelectorAll('.rounded-full');
    expect(legendItems.length).toBe(2);
  });
});
