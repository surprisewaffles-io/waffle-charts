import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BubbleChart } from '../BubbleChart';

// ... mocks ... (keep them)

class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
}
vi.stubGlobal('ResizeObserver', ResizeObserver);

vi.mock('@visx/axis', () => ({
  AxisBottom: () => null,
  AxisLeft: () => null,
}));

vi.mock('@visx/responsive', () => ({
  ParentSize: ({ children }: { children: (args: { width: number; height: number }) => React.ReactNode }) =>
    children({ width: 500, height: 300 }),
}));

// Mock TooltipInPortal to render inline for tests
vi.mock('@visx/tooltip', async () => {
  const actual = await vi.importActual<typeof import('@visx/tooltip')>('@visx/tooltip');
  return {
    ...actual,
    useTooltipInPortal: () => ({
      containerRef: (_node: any) => { },
      TooltipInPortal: ({ children }: { children: React.ReactNode }) => {
        return <div>{children}</div>;
      },
    }),
  };
});

const mockData = [
  { a: 10, b: 20, c: 30 },
  { a: 50, b: 60, c: 70 },
];

describe('BubbleChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <BubbleChart
        data={mockData}
        xKey="a"
        yKey="b"
        zKey="c"
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders circles for bubbles', () => {
    const { container } = render(
      <BubbleChart
        data={mockData}
        xKey="a"
        yKey="b"
        zKey="c"
      />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(2);
  });

  it('shows tooltip with X, Y, Z values on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <BubbleChart
        data={mockData}
        xKey="a"
        yKey="b"
        zKey="c"
      />
    );

    const circles = container.querySelectorAll('circle');
    // fireEvent.mouseOver(circles[0]);
    await user.hover(circles[0]);

    // Tooltip renders "X: 10", "Y: 20", "Z: 30"
    expect(await screen.findAllByText(/10/)).toHaveLength(1);
    expect(await screen.findAllByText(/20/)).toHaveLength(1);
    expect(await screen.findAllByText(/30/)).toHaveLength(1);
  });
});
