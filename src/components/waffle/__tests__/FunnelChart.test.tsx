import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FunnelChart } from '../FunnelChart';

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
  { step: 'Step 1', value: 100 },
  { step: 'Step 2', value: 50 },
  { step: 'Step 3', value: 25 },
];

describe('FunnelChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <FunnelChart
        data={mockData}
        stepKey="step"
        valueKey="value"
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders polygons for each step', () => {
    const { container } = render(
      <FunnelChart
        data={mockData}
        stepKey="step"
        valueKey="value"
      />
    );
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBe(mockData.length);
  });

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FunnelChart
        data={mockData}
        stepKey="step"
        valueKey="value"
      />
    );

    const polygons = container.querySelectorAll('polygon');
    const firstPolygon = polygons[0];

    if (firstPolygon) {
      await user.hover(firstPolygon);
      expect(await screen.findByText('Step 1')).toBeInTheDocument();
      // Use text content match or regex for value
      expect(await screen.findByText('Value: 100')).toBeInTheDocument();
    }
  });
});
