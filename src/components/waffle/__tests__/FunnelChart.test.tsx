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

describe('FunnelChart edge-case data', () => {
  // Callers in plain JS can pass anything; the assertion reproduces that
  // without weakening the component's own types.
  const asData = (value: unknown) => value as typeof mockData;

  it('renders a fallback instead of a chart when data is empty', () => {
    render(<FunnelChart data={[]} stepKey="step" valueKey="value" />);
    expect(screen.getByRole('status')).toHaveTextContent('No data to display');
  });

  it('renders a custom empty message when one is supplied', () => {
    render(
      <FunnelChart data={[]} stepKey="step" valueKey="value" emptyMessage="No steps recorded" />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No steps recorded');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders the fallback when data is %s', (_label, value) => {
    render(<FunnelChart data={asData(value)} stepKey="step" valueKey="value" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback when every row has a non-numeric value', () => {
    render(
      <FunnelChart data={asData([{ step: 'Step 1', value: 'many' }])} stepKey="step" valueKey="value" />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a chart for a single step', () => {
    const { container } = render(
      <FunnelChart data={[mockData[0]]} stepKey="step" valueKey="value" />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('polygon').length).toBe(1);
  });

  it('produces finite geometry when every step value is zero', () => {
    const { container } = render(
      <FunnelChart
        data={[{ step: 'Step 1', value: 0 }, { step: 'Step 2', value: 0 }]}
        stepKey="step"
        valueKey="value"
      />,
    );
    expect(container.innerHTML).not.toMatch(/Infinity|NaN/);
  });

  it('keeps hook order stable when data arrives after an empty render', () => {
    const { container, rerender } = render(
      <FunnelChart data={[]} stepKey="step" valueKey="value" />,
    );
    rerender(<FunnelChart data={mockData} stepKey="step" valueKey="value" />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('polygon').length).toBe(3);
  });
});
