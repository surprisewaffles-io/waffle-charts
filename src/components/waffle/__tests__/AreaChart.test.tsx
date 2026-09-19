import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AreaChart } from '../AreaChart';

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
  { date: '2024-01-01', a: 100, b: 200 },
  { date: '2024-01-02', a: 150, b: 250 },
  { date: '2024-01-03', a: 200, b: 300 },
];

describe('AreaChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <AreaChart
        data={mockData}
        xKey="date"
        keys={['a', 'b']}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders stack paths', () => {
    const { container } = render(
      <AreaChart
        data={mockData}
        xKey="date"
        keys={['a', 'b']}
      />
    );
    // Area chart renders paths for stacks
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it('applies custom color classes', () => {
    const { container } = render(
      <AreaChart
        data={mockData}
        xKey="date"
        keys={['a', 'b']}
        colors={['text-red-500', 'text-blue-500']}
      />
    );
    // The colour class sits on the <g> wrapping each band, not on the band's
    // own path: a Tailwind text class only sets `color`, and the gradient
    // stops read that back as `currentColor`, so the class has to be an
    // ancestor of the <defs>.
    const groups = container.querySelectorAll('g');
    const hasRed = Array.from(groups).some(g => g.classList.contains('text-red-500'));
    const hasBlue = Array.from(groups).some(g => g.classList.contains('text-blue-500'));

    expect(hasRed).toBe(true);
    expect(hasBlue).toBe(true);
  });

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AreaChart
        data={mockData}
        xKey="date"
        keys={['a', 'b']}
      />
    );

    // Find overlay rect (fill transparent)
    const rects = container.querySelectorAll('rect');
    const overlay = Array.from(rects).find(r => r.getAttribute('fill') === 'transparent');

    if (overlay) {
      await user.hover(overlay);

      // Tooltip should show values for a and b
      // We can search for known values like "150" or "250" (middle point values)
      // or check for keys "a:" "b:"

      const labelA = await screen.findAllByText("a:");
      const labelB = await screen.findAllByText("b:");

      expect(labelA.length).toBeGreaterThan(0);
      expect(labelB.length).toBeGreaterThan(0);
    } else {
      throw new Error("Overlay rect not found");
    }
  });
});

/**
 * jsdom's selector engine matches `linearGradient` only as the rightmost part
 * of a selector, never as an ancestor: `defs linearGradient` finds the
 * gradients, but `linearGradient stop` returns nothing and would make an
 * assertion over the stops pass vacuously. So the gradients are selected first
 * and their stops read by scoping from the element. Real browsers do not need
 * this; do not fold these back into one selector.
 */
const gradientsIn = (container: Element) =>
  Array.from(container.querySelectorAll('defs linearGradient'));

const stopsOf = (gradient: Element) => Array.from(gradient.querySelectorAll('stop'));

describe('AreaChart series gradients', () => {
  it('points every stack fill at a gradient defined in the same svg', () => {
    const { container } = render(
      <AreaChart data={mockData} xKey="date" keys={['a', 'b']} />,
    );
    const bands = Array.from(container.querySelectorAll('path'));

    expect(bands).toHaveLength(2);
    for (const band of bands) {
      const fill = band.getAttribute('fill') ?? '';
      const id = fill.match(/^url\(#(.+)\)$/)?.[1];
      expect(id, `fill should be a gradient reference, got ${fill}`).toBeTruthy();
      expect(container.querySelector(`defs > linearGradient[id="${id}"]`)).not.toBeNull();
    }
  });

  it('runs each gradient straight down the plot area', () => {
    const { container } = render(
      <AreaChart data={mockData} xKey="date" keys={['a', 'b']} />,
    );
    const gradients = gradientsIn(container);

    expect(gradients).toHaveLength(2);
    for (const gradient of gradients) {
      // userSpaceOnUse spans the whole plot height, so every band's fade sits
      // on one ramp. objectBoundingBox would restart the ramp inside each band
      // and make a thin band read as dark as a tall one.
      expect(gradient.getAttribute('gradientUnits')).toBe('userSpaceOnUse');
      // Vertical: no horizontal component.
      expect(gradient.getAttribute('x1')).toBe(gradient.getAttribute('x2'));
      expect(Number(gradient.getAttribute('y1'))).toBe(0);
      // height 300 less top margin 40 and bottom margin 50.
      expect(Number(gradient.getAttribute('y2'))).toBe(210);
    }
  });

  it('fades each band from an opaque top to a translucent baseline', () => {
    const { container } = render(
      <AreaChart data={mockData} xKey="date" keys={['a', 'b']} />,
    );

    for (const gradient of gradientsIn(container)) {
      const stops = stopsOf(gradient);
      expect(stops.map(s => s.getAttribute('offset'))).toEqual(['0%', '100%']);

      const top = Number(stops[0].getAttribute('stop-opacity'));
      const bottom = Number(stops[1].getAttribute('stop-opacity'));
      expect(top).toBeGreaterThan(bottom);
      expect(bottom).toBeGreaterThan(0);
    }
  });

  it('writes a paint-value series straight into the stops', () => {
    const { container } = render(
      <AreaChart data={mockData} xKey="date" keys={['a', 'b']} colors={['#112233', '#445566']} />,
    );
    const colors = gradientsIn(container).map(g =>
      stopsOf(g).map(s => s.getAttribute('stop-color')),
    );

    // Both stops of a band carry that band's own colour; only the opacity moves.
    expect(colors).toEqual([
      ['#112233', '#112233'],
      ['#445566', '#445566'],
    ]);
  });

  it('fades a Tailwind class series through currentColor', () => {
    const { container } = render(
      <AreaChart
        data={mockData}
        xKey="date"
        keys={['a', 'b']}
        colors={['text-red-500', 'text-blue-500']}
      />,
    );

    for (const gradient of gradientsIn(container)) {
      // A class sets `color`, not a paint, so the stops have to read it back.
      expect(stopsOf(gradient).map(s => s.getAttribute('stop-color'))).toEqual([
        'currentColor',
        'currentColor',
      ]);
      // currentColor resolves against the stop's own inherited value, so the
      // class must be on an ancestor of the <defs>, not on the filled path.
      expect(gradient.closest('g.text-red-500, g.text-blue-500')).not.toBeNull();
    }
  });

  it('gives two charts on one page disjoint gradient ids', () => {
    // A shared id would make both charts resolve to whichever <defs> the
    // browser parsed first, so the second chart would wear the first's colours.
    const { container } = render(
      <>
        <AreaChart data={mockData} xKey="date" keys={['a', 'b']} colors={['#111111', '#222222']} />
        <AreaChart data={mockData} xKey="date" keys={['a', 'b']} colors={['#aaaaaa', '#bbbbbb']} />
      </>,
    );

    const ids = gradientsIn(container).map(g => g.getAttribute('id'));

    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    // querySelector rejects the ':' useId embeds, so the ids must be stripped
    // of it — this is what makes the lookup in the first test work at all.
    for (const id of ids) {
      expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });
});

describe('AreaChart edge-case data', () => {
  // Callers in plain JS can pass anything; the double assertion reproduces
  // that without weakening the component's own types.
  const asData = (value: unknown) => value as typeof mockData;

  it('renders a fallback instead of a chart when data is empty', () => {
    render(<AreaChart data={[]} xKey="date" keys={['a', 'b']} />);
    expect(screen.getByRole('status')).toHaveTextContent('No data to display');
  });

  it('renders a custom empty message when one is supplied', () => {
    render(
      <AreaChart data={[]} xKey="date" keys={['a', 'b']} emptyMessage="Nothing tracked yet" />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Nothing tracked yet');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders the fallback when data is %s', (_label, value) => {
    render(<AreaChart data={asData(value)} xKey="date" keys={['a', 'b']} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback when every row has an unparseable date', () => {
    render(
      <AreaChart
        data={[{ date: 'not-a-date', a: 1, b: 2 }]}
        xKey="date"
        keys={['a', 'b']}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a chart for a single data point', () => {
    const { container } = render(
      <AreaChart data={[mockData[0]]} xKey="date" keys={['a', 'b']} />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('produces finite scale geometry rather than Infinity for a single point', () => {
    const { container } = render(
      <AreaChart data={[mockData[0]]} xKey="date" keys={['a', 'b']} />,
    );
    expect(container.innerHTML).not.toMatch(/Infinity|NaN/);
  });

  it('keeps hook order stable when data arrives after an empty render', () => {
    const { rerender } = render(<AreaChart data={[]} xKey="date" keys={['a', 'b']} />);
    rerender(<AreaChart data={mockData} xKey="date" keys={['a', 'b']} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(document.querySelectorAll('path').length).toBeGreaterThanOrEqual(2);
  });
});
