import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { RadarChart } from '../RadarChart';

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
  { subject: 'Math', score: 100 },
  { subject: 'Science', score: 80 },
  { subject: 'Art', score: 90 },
];

describe('RadarChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <RadarChart
        data={mockData}
        radiusKey="score"
        angleKey="subject"
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders grid polygons', () => {
    const { container } = render(
      <RadarChart
        data={mockData}
        radiusKey="score"
        angleKey="subject"
      />
    );
    // Radar chart uses polygons for grid
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThan(0);
  });

  it('renders axis labels', () => {
    const { getByText } = render(
      <RadarChart
        data={mockData}
        radiusKey="score"
        angleKey="subject"
      />
    );
    expect(getByText('Math')).toBeInTheDocument();
    expect(getByText('Science')).toBeInTheDocument();
  });

  it('applies custom polygon color', () => {
    const { container } = render(
      <RadarChart
        data={mockData}
        radiusKey="score"
        angleKey="subject"
        polygonColor="fill-green-500"
      />
    );
    const polygons = container.querySelectorAll('polygon');
    // The main radar polygon should have this class.
    // It's the one that is NOT the grid (grid usually transparent fill or stroke only).
    // Or simpler: check if any polygon has the class.
    const hasGreen = Array.from(polygons).some(p => p.classList.contains('fill-green-500'));
    expect(hasGreen).toBe(true);
  });
});

describe('RadarChart edge-case data', () => {
  // Callers in plain JS can pass anything; the assertion reproduces that
  // without weakening the component's own types.
  const asData = (value: unknown) => value as typeof mockData;

  it('renders a fallback instead of a chart when data is empty', () => {
    render(<RadarChart data={[]} radiusKey="score" angleKey="subject" />);
    expect(screen.getByRole('status')).toHaveTextContent('No data to display');
  });

  it('renders a custom empty message when one is supplied', () => {
    render(
      <RadarChart data={[]} radiusKey="score" angleKey="subject" emptyMessage="No scores yet" />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No scores yet');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders the fallback when data is %s', (_label, value) => {
    render(<RadarChart data={asData(value)} radiusKey="score" angleKey="subject" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback when every row has a non-numeric radius', () => {
    render(
      <RadarChart
        data={asData([{ subject: 'Math', score: 'high' }])}
        radiusKey="score"
        angleKey="subject"
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a chart for a single spoke', () => {
    const { container } = render(
      <RadarChart data={[mockData[0]]} radiusKey="score" angleKey="subject" />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('polygon').length).toBeGreaterThan(0);
  });

  it('produces finite geometry rather than Infinity for a single spoke', () => {
    const { container } = render(
      <RadarChart data={[mockData[0]]} radiusKey="score" angleKey="subject" />,
    );
    expect(container.innerHTML).not.toMatch(/Infinity|NaN/);
  });

  it('keeps hook order stable when data arrives after an empty render', () => {
    const { container, rerender } = render(
      <RadarChart data={[]} radiusKey="score" angleKey="subject" />,
    );
    rerender(<RadarChart data={mockData} radiusKey="score" angleKey="subject" />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('circle').length).toBe(3);
  });
});
