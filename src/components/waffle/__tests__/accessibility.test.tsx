/**
 * Why: #5 requires WCAG 2.1 Level AA for every chart. Sixteen near-identical
 * test files would drift; one contract run against every chart cannot.
 *
 * What: renders each SVG chart with representative data and asserts the four
 * things the shared accessibility layer promises — an accessible name, a
 * `<title>`/`<desc>` pair, a keyboard path that announces each datum, and a
 * table alternative. ChartLegend is not an SVG chart and carries list
 * semantics instead; its contract lives in `ChartLegend.test.tsx`.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Charts size themselves from their parent, which jsdom reports as zero.
vi.mock('@visx/responsive', () => ({
  ParentSize: ({ children }: { children: (args: { width: number; height: number }) => React.ReactNode }) =>
    children({ width: 600, height: 400 }),
}));

import { AreaChart } from '../AreaChart';
import { BarChart } from '../BarChart';
import { BubbleChart } from '../BubbleChart';
import { CandlestickChart } from '../CandlestickChart';
import { ChordChart } from '../ChordChart';
import { CompositeChart } from '../CompositeChart';
import { FunnelChart } from '../FunnelChart';
import { HeatmapChart } from '../HeatmapChart';
import { LineChart } from '../LineChart';
import { PieChart } from '../PieChart';
import { RadarChart } from '../RadarChart';
import { RadialBarChart } from '../RadialBarChart';
import { SankeyChart } from '../SankeyChart';
import { ScatterChart } from '../ScatterChart';
import { TreemapChart } from '../TreemapChart';
import { WaffleChart } from '../WaffleChart';

const dates = ['2024-01-01', '2024-02-01', '2024-03-01'];

const seriesRows = dates.map((date, i) => ({
  date,
  value: (i + 1) * 10,
  other: (i + 1) * 5,
}));

const categoryRows = [
  { label: 'Alpha', value: 10, second: 4 },
  { label: 'Beta', value: 20, second: 8 },
  { label: 'Gamma', value: 30, second: 12 },
];

const ohlcRows = dates.map((date, i) => ({
  date,
  open: 10 + i,
  high: 14 + i,
  low: 8 + i,
  close: 12 + i,
}));

/**
 * Each entry names a chart, the props that make it draw something, and how many
 * data points its keyboard cursor should traverse. The count is asserted rather
 * than inferred so a chart that silently drops rows fails here.
 */
const charts: {
  name: string;
  itemCount: number;
  render: (a11yProps: Record<string, unknown>) => React.ReactElement;
}[] = [
  {
    name: 'AreaChart',
    itemCount: 3,
    render: p => <AreaChart data={seriesRows} xKey="date" keys={['value', 'other']} {...p} />,
  },
  {
    name: 'BarChart',
    itemCount: 3,
    render: p => <BarChart data={categoryRows} xKey="label" yKey="value" {...p} />,
  },
  {
    name: 'BarChart (stacked)',
    itemCount: 3,
    render: p => (
      <BarChart data={categoryRows} xKey="label" variant="stacked" keys={['value', 'second']} {...p} />
    ),
  },
  {
    name: 'BubbleChart',
    itemCount: 3,
    render: p => (
      <BubbleChart data={categoryRows} xKey="value" yKey="second" zKey="value" {...p} />
    ),
  },
  {
    name: 'CandlestickChart',
    itemCount: 3,
    render: p => (
      <CandlestickChart
        data={ohlcRows}
        xKey="date"
        openKey="open"
        highKey="high"
        lowKey="low"
        closeKey="close"
        {...p}
      />
    ),
  },
  {
    name: 'ChordChart',
    itemCount: 3,
    render: p => (
      <ChordChart
        data={[
          [0, 5, 3],
          [5, 0, 2],
          [3, 2, 0],
        ]}
        keys={['A', 'B', 'C']}
        {...p}
      />
    ),
  },
  {
    name: 'CompositeChart',
    itemCount: 3,
    render: p => (
      <CompositeChart data={categoryRows} xKey="label" barKey="value" lineKey="second" {...p} />
    ),
  },
  {
    name: 'FunnelChart',
    itemCount: 3,
    render: p => <FunnelChart data={categoryRows} stepKey="label" valueKey="value" {...p} />,
  },
  {
    name: 'HeatmapChart',
    itemCount: 4,
    render: p => (
      <HeatmapChart
        data={[
          { bin: 0, bins: [{ bin: 0, count: 1 }, { bin: 1, count: 2 }] },
          { bin: 1, bins: [{ bin: 0, count: 3 }, { bin: 1, count: 4 }] },
        ]}
        {...p}
      />
    ),
  },
  {
    name: 'LineChart',
    itemCount: 3,
    render: p => <LineChart data={seriesRows} xKey="date" yKey="value" {...p} />,
  },
  {
    name: 'PieChart',
    itemCount: 3,
    render: p => <PieChart data={categoryRows} valueKey="value" labelKey="label" {...p} />,
  },
  {
    name: 'RadarChart',
    itemCount: 3,
    render: p => <RadarChart data={categoryRows} radiusKey="value" angleKey="label" {...p} />,
  },
  {
    name: 'RadialBarChart',
    itemCount: 3,
    render: p => <RadialBarChart data={categoryRows} valueKey="value" labelKey="label" {...p} />,
  },
  {
    name: 'SankeyChart',
    itemCount: 3,
    render: p => (
      <SankeyChart
        data={{
          nodes: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
          links: [
            { source: 0, target: 1, value: 5 },
            { source: 1, target: 2, value: 3 },
          ],
        }}
        {...p}
      />
    ),
  },
  {
    name: 'ScatterChart',
    itemCount: 3,
    render: p => <ScatterChart data={categoryRows} xKey="value" yKey="second" {...p} />,
  },
  {
    name: 'TreemapChart',
    itemCount: 3,
    render: p => (
      <TreemapChart
        data={{
          name: 'root',
          children: [
            { name: 'A', size: 10 },
            { name: 'B', size: 20 },
            { name: 'C', size: 30 },
          ],
        }}
        {...p}
      />
    ),
  },
  {
    name: 'WaffleChart',
    itemCount: 3,
    render: p => <WaffleChart data={categoryRows} labelKey="label" valueKey="value" {...p} />,
  },
];

describe.each(charts)('$name accessibility', ({ render: renderChart, itemCount }) => {
  it('exposes the chart as a named image', () => {
    render(renderChart({}));
    const svg = screen.getByRole('img');
    expect(svg).toBeInTheDocument();
    expect(svg.getAttribute('aria-label')).toMatch(/\S/);
  });

  it('renders a title and a description inside the SVG', () => {
    const { container } = render(renderChart({}));
    const svg = container.querySelector('svg[role="img"]')!;
    const svgTitle = svg.querySelector('title');
    const desc = svg.querySelector('desc');
    expect(svgTitle?.textContent).toMatch(/\S/);
    expect(desc?.textContent).toMatch(/\S/);
    expect(svg.getAttribute('aria-describedby')).toBe(desc?.getAttribute('id'));
  });

  it('honours an explicit label, title, and description', () => {
    const { container } = render(
      renderChart({
        ariaLabel: 'Quarterly sales',
        title: '2024 results',
        description: 'Sales rose every quarter.',
      }),
    );
    const svg = container.querySelector('svg[role="img"]')!;
    expect(svg).toHaveAttribute('aria-label', 'Quarterly sales');
    expect(svg.querySelector('title')?.textContent).toBe('2024 results');
    expect(svg.querySelector('desc')?.textContent).toBe('Sales rose every quarter.');
  });

  it('is reachable with Tab and carries a focus ring', async () => {
    const user = userEvent.setup();
    render(renderChart({}));
    await user.tab();
    const svg = screen.getByRole('img');
    expect(svg).toHaveFocus();
    expect(svg.getAttribute('class')).toContain('focus-visible:outline-2');
  });

  it('announces each data point as the arrow keys move through it', async () => {
    const user = userEvent.setup();
    const { container } = render(renderChart({}));
    await user.tab();
    await user.keyboard('{ArrowRight}');

    const live = container.querySelector('[aria-live="polite"]')!;
    expect(live.textContent).toMatch(new RegExp(`^1 of ${itemCount}\\.`));

    await user.keyboard('{End}');
    expect(live.textContent).toMatch(new RegExp(`^${itemCount} of ${itemCount}\\.`));

    await user.keyboard('{Escape}');
    expect(live.textContent).toBe('');
  });

  it('offers a data table alternative with one row per data point', () => {
    const { container } = render(renderChart({}));
    const svg = container.querySelector('svg[role="img"]')!;
    const table = container.querySelector(`table#${CSS.escape(svg.getAttribute('aria-details')!)}`)!;
    expect(table).toBeInTheDocument();
    // One header row plus one row per data point.
    expect(within(table as HTMLElement).getAllByRole('row')).toHaveLength(itemCount + 1);
  });

  it('marks the focused datum on screen', async () => {
    const user = userEvent.setup();
    const { container } = render(renderChart({}));
    expect(
      container.querySelectorAll('[data-chart-focused], [data-chart-focus-marker]'),
    ).toHaveLength(0);

    await user.tab();
    await user.keyboard('{ArrowRight}');

    // Continuous charts draw one crosshair; shape charts ring the shape, and a
    // stacked bar rings every segment of the focused category.
    expect(
      container.querySelectorAll('[data-chart-focused], [data-chart-focus-marker]').length,
    ).toBeGreaterThan(0);
  });

  it('leaves the tab order when keyboardNavigable is false', () => {
    render(renderChart({ keyboardNavigable: false }));
    expect(screen.getByRole('img')).not.toHaveAttribute('tabindex');
  });
});

/**
 * Two charts cannot use the loop index directly as the accessible index, so
 * their mapping is asserted on its own rather than through the generic
 * contract, which a right-shaped-but-wrong-row mapping would still satisfy.
 */
describe('index mapping for charts whose draw order differs from their data order', () => {
  it('walks TreemapChart nodes in the order the treemap drew them', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TreemapChart
        data={{
          name: 'root',
          children: [
            { name: 'A', size: 10 },
            { name: 'B', size: 20 },
            { name: 'C', size: 30 },
          ],
        }}
      />,
    );
    const live = container.querySelector('[aria-live="polite"]')!;

    // The cursor indexes `descendants()` minus the root, so the first node it
    // reaches is the first node the treemap draws. It is the first child as
    // supplied, not the largest: TreemapChart calls `.sort()` before `.sum()`,
    // so every node's value is still undefined when the comparator runs and
    // the sort leaves the order alone.
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(live.textContent).toBe('1 of 3. A: 10, 17 percent of the total');

    await user.keyboard('{ArrowRight}');
    expect(live.textContent).toBe('2 of 3. B: 20, 33 percent of the total');
  });

  it('walks HeatmapChart cells column by column', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <HeatmapChart
        data={[
          { bin: 10, bins: [{ bin: 0, count: 1 }, { bin: 1, count: 2 }] },
          { bin: 20, bins: [{ bin: 0, count: 3 }, { bin: 1, count: 4 }] },
        ]}
      />,
    );
    const live = container.querySelector('[aria-live="polite"]')!;

    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(live.textContent).toBe('1 of 4. Column 10, row 0: 1');

    // Cell 3 is the first cell of the second column, which is what proves the
    // flat index advances by the previous column's length.
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(live.textContent).toBe('3 of 4. Column 20, row 0: 3');
  });
});
