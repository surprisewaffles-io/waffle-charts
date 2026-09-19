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

/**
 * jsdom's selector engine matches `radialGradient` only as the rightmost part
 * of a selector, never as an ancestor, so the gradients are selected first and
 * their stops read by scoping from the element. Real browsers do not need
 * this; do not fold these back into one selector.
 */
const gradientsIn = (container: Element) =>
  Array.from(container.querySelectorAll('defs radialGradient'));

const stopsOf = (gradient: Element) => Array.from(gradient.querySelectorAll('stop'));

/** The radar polygon is the only one carrying a fill; the grid rings are transparent. */
const radarPolygon = (container: Element) =>
  Array.from(container.querySelectorAll('polygon')).find(
    p => (p.getAttribute('fill') ?? '').startsWith('url('),
  );

describe('RadarChart polygon gradient', () => {
  it('fills the polygon from a gradient defined in the same svg', () => {
    const { container } = render(
      <RadarChart data={mockData} radiusKey="score" angleKey="subject" polygonColor="#a855f7" />,
    );

    const polygon = radarPolygon(container);
    const id = (polygon?.getAttribute('fill') ?? '').match(/^url\(#(.+)\)$/)?.[1];
    expect(id).toBeTruthy();
    expect(container.querySelector(`defs > radialGradient[id="${id}"]`)).not.toBeNull();
  });

  it('centres the gradient on the chart origin rather than the polygon box', () => {
    const { container } = render(
      <RadarChart data={mockData} radiusKey="score" angleKey="subject" polygonColor="#a855f7" />,
    );
    const [gradient] = gradientsIn(container);

    // The spokes all meet at (0,0) of the translated group. objectBoundingBox
    // would centre on the polygon's own box, which drifts off that origin
    // whenever the spokes are uneven — exactly the case the fade is drawn for.
    expect(gradient.getAttribute('gradientUnits')).toBe('userSpaceOnUse');
    expect(Number(gradient.getAttribute('cx'))).toBe(0);
    expect(Number(gradient.getAttribute('cy'))).toBe(0);
    // width 500 less 80 of margin, height 300 less 80, halved.
    expect(Number(gradient.getAttribute('r'))).toBe(110);
  });

  it('runs from a stronger centre to a fainter rim', () => {
    const { container } = render(
      <RadarChart data={mockData} radiusKey="score" angleKey="subject" polygonColor="#a855f7" />,
    );
    const stops = stopsOf(gradientsIn(container)[0]);

    expect(stops.map(s => s.getAttribute('offset'))).toEqual(['0%', '100%']);
    expect(stops.map(s => s.getAttribute('stop-color'))).toEqual(['#a855f7', '#a855f7']);

    const centre = Number(stops[0].getAttribute('stop-opacity'));
    const rim = Number(stops[1].getAttribute('stop-opacity'));
    expect(centre).toBeGreaterThan(rim);
    expect(rim).toBeGreaterThan(0);
  });

  it('takes its paint from the color prop when one is given', () => {
    const { container } = render(
      <RadarChart data={mockData} radiusKey="score" angleKey="subject" color="rgb(1, 2, 3)" />,
    );
    const stops = stopsOf(gradientsIn(container)[0]);

    // Opacity rides on the stops, not on an `RRGGBBAA` suffix, so an rgb()
    // colour fades too. Appending "33" to one produced an invalid colour.
    expect(stops.map(s => s.getAttribute('stop-color'))).toEqual([
      'rgb(1, 2, 3)',
      'rgb(1, 2, 3)',
    ]);
    expect(radarPolygon(container)?.getAttribute('stroke')).toBe('rgb(1, 2, 3)');
  });

  it('keeps the flat class fill when polygonColor is a Tailwind class', () => {
    const { container } = render(
      <RadarChart
        data={mockData}
        radiusKey="score"
        angleKey="subject"
        polygonColor="fill-green-500"
      />,
    );

    // A class carries no paint value the component can read into a stop, so
    // those callers keep the existing flat fill rather than a broken gradient.
    expect(gradientsIn(container)).toHaveLength(0);
    expect(radarPolygon(container)).toBeUndefined();
  });

  it('gives two charts on one page disjoint gradient ids', () => {
    // A shared id would make both charts resolve to whichever <defs> the
    // browser parsed first, so the second chart would wear the first's colour.
    const { container } = render(
      <>
        <RadarChart data={mockData} radiusKey="score" angleKey="subject" color="#111111" />
        <RadarChart data={mockData} radiusKey="score" angleKey="subject" color="#222222" />
      </>,
    );

    const ids = gradientsIn(container).map(g => g.getAttribute('id'));

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    // querySelector rejects the ':' useId embeds, so the ids must be stripped.
    for (const id of ids) {
      expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    }
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
