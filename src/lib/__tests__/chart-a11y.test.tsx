import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartA11yLayer, ChartSvgDescription } from '../../components/waffle/ChartA11y';
import {
  buildChartDescription,
  dataPointFocusProps,
  summarizeValues,
  useChartA11y,
  type ChartA11yProps,
} from '../chart-a11y';

const points = [
  { label: 'A', value: 10 },
  { label: 'B', value: 20 },
  { label: 'C', value: 30 },
];

type HarnessProps = ChartA11yProps & {
  onActivate?: (index: number) => void;
  itemCount?: number;
};

/**
 * Stands in for a real chart: the same hook call, the same three pieces of
 * markup, and nothing else. Keeps these tests about the shared contract rather
 * than about any one chart's geometry.
 */
function Harness({ onActivate, itemCount = points.length, ...a11yProps }: HarnessProps) {
  const a11y = useChartA11y({
    chartType: 'Test chart',
    itemCount,
    itemNoun: 'bar',
    values: points.slice(0, itemCount).map(p => p.value),
    describeItem: index => `${points[index].label}: ${points[index].value}`,
    onActivate,
    ...a11yProps,
  });

  return (
    <div>
      <svg {...a11y.svgProps} width={100} height={100}>
        <ChartSvgDescription
          titleId={a11y.titleId}
          descId={a11y.descId}
          title={a11y.resolvedTitle}
          description={a11y.resolvedDescription}
        />
        {points.slice(0, itemCount).map((p, i) => (
          <rect
            key={p.label}
            data-testid={`point-${i}`}
            width={10}
            height={10}
            {...dataPointFocusProps(a11y.focusedIndex === i)}
          />
        ))}
      </svg>
      <ChartA11yLayer
        a11y={a11y}
        columns={['Label', 'Value']}
        rows={points.slice(0, itemCount).map(p => [p.label, p.value])}
      />
    </div>
  );
}

describe('summarizeValues', () => {
  it('reports range and average for a finite series', () => {
    expect(summarizeValues([10, 20, 30])).toBe('Range: 10 to 30. Average: 20.');
  });

  it('rounds a fractional average to one decimal', () => {
    expect(summarizeValues([1, 2])).toBe('Range: 1 to 2. Average: 1.5.');
  });

  it('ignores non-finite entries rather than producing NaN', () => {
    expect(summarizeValues([1, Number.NaN, Infinity, 3])).toBe('Range: 1 to 3. Average: 2.');
  });

  it('returns null when nothing is summarisable', () => {
    expect(summarizeValues([])).toBeNull();
    expect(summarizeValues([Number.NaN])).toBeNull();
  });
});

describe('buildChartDescription', () => {
  it('states the chart type, the count, and the range', () => {
    expect(buildChartDescription({ chartType: 'Bar chart', itemCount: 3, values: [1, 2, 3] })).toBe(
      'Bar chart with 3 data points. Range: 1 to 3. Average: 2.',
    );
  });

  it('uses the singular noun for one point', () => {
    expect(buildChartDescription({ chartType: 'Pie chart', itemCount: 1, itemNoun: 'slice' })).toBe(
      'Pie chart with 1 slice.',
    );
  });

  it('appends a caller-supplied detail clause', () => {
    expect(
      buildChartDescription({ chartType: 'Bar chart', itemCount: 2, detail: '3 series.' }),
    ).toBe('Bar chart with 2 data points. 3 series.');
  });
});

describe('useChartA11y ARIA wiring', () => {
  it('names the SVG with a generated description when no label is given', () => {
    render(<Harness />);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Test chart with 3 bars. Range: 10 to 30. Average: 20.',
    );
  });

  it('prefers an explicit ariaLabel over the generated one', () => {
    render(<Harness ariaLabel="Sales by quarter" />);
    expect(screen.getByRole('img')).toHaveAccessibleName('Sales by quarter');
  });

  it('renders title and desc as the first children of the SVG', () => {
    const { container } = render(<Harness title="2024 Sales" description="Custom prose." />);
    const svg = container.querySelector('svg')!;
    expect(svg.children[0].tagName).toBe('title');
    expect(svg.children[0].textContent).toBe('2024 Sales');
    expect(svg.children[1].tagName).toBe('desc');
    expect(svg.children[1].textContent).toBe('Custom prose.');
  });

  it('points aria-describedby at its own desc by default', () => {
    const { container } = render(<Harness />);
    const svg = container.querySelector('svg')!;
    const descId = svg.getAttribute('aria-describedby');
    expect(container.querySelector(`desc#${CSS.escape(descId!)}`)).not.toBeNull();
  });

  it('honours an external ariaDescribedby target', () => {
    render(<Harness ariaDescribedby="external-notes" />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-describedby', 'external-notes');
  });

  it('points aria-details at the data table', () => {
    const { container } = render(<Harness />);
    const svg = container.querySelector('svg')!;
    const tableId = svg.getAttribute('aria-details');
    expect(container.querySelector(`table#${CSS.escape(tableId!)}`)).not.toBeNull();
  });
});

describe('useChartA11y keyboard navigation', () => {
  it('places the chart in the tab order', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    expect(screen.getByRole('img')).toHaveFocus();
  });

  it('drops out of the tab order when keyboardNavigable is false', () => {
    render(<Harness keyboardNavigable={false} />);
    expect(screen.getByRole('img')).not.toHaveAttribute('tabindex');
  });

  it('announces the focused point', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('1 of 3. A: 10')).toBeInTheDocument();
  });

  it('advances with ArrowRight and ArrowDown alike', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowDown}');
    expect(screen.getByText('2 of 3. B: 20')).toBeInTheDocument();
  });

  it('retreats with ArrowLeft', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowLeft}');
    expect(screen.getByText('1 of 3. A: 10')).toBeInTheDocument();
  });

  it('starts at the last point when the first press is ArrowLeft', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('3 of 3. C: 30')).toBeInTheDocument();
  });

  it('wraps from the last point to the first', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard('{End}{ArrowRight}');
    expect(screen.getByText('1 of 3. A: 10')).toBeInTheDocument();
  });

  it('jumps to the ends with Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard('{End}');
    expect(screen.getByText('3 of 3. C: 30')).toBeInTheDocument();
    await user.keyboard('{Home}');
    expect(screen.getByText('1 of 3. A: 10')).toBeInTheDocument();
  });

  it('activates the focused point on Enter', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Harness onActivate={onActivate} />);
    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}{Enter}');
    expect(onActivate).toHaveBeenCalledWith(1);
  });

  it('activates the focused point on Space', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Harness onActivate={onActivate} />);
    await user.tab();
    await user.keyboard('{ArrowRight}[Space]');
    expect(onActivate).toHaveBeenCalledWith(0);
  });

  it('does not activate when nothing is focused', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Harness onActivate={onActivate} />);
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('clears the selection on Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('1 of 3. A: 10')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('1 of 3. A: 10')).not.toBeInTheDocument();
  });

  it('ignores the arrow keys when keyboardNavigable is false', async () => {
    const user = userEvent.setup();
    render(<Harness keyboardNavigable={false} />);
    const svg = screen.getByRole('img');
    svg.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.queryByText(/1 of 3/)).not.toBeInTheDocument();
  });

  it('ignores the arrow keys when there is no data', async () => {
    const user = userEvent.setup();
    render(<Harness itemCount={0} />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(screen.queryByText(/of 0/)).not.toBeInTheDocument();
  });

  it('clears the selection when focus leaves the chart', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Harness />
        <button type="button">after</button>
      </>,
    );
    await user.tab();
    await user.keyboard('{ArrowRight}');
    await user.tab();
    expect(screen.queryByText('1 of 3. A: 10')).not.toBeInTheDocument();
  });
});

describe('focus indicator', () => {
  it('carries a focus-visible outline on the chart', () => {
    render(<Harness />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('class')).toContain('focus-visible:outline-2');
    expect(svg.getAttribute('class')).toContain('focus-visible:outline-offset-2');
  });

  it('strokes only the focused data point', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    // Inline style, not a presentation attribute: Tailwind stroke utilities on
    // the shape would outrank an attribute and hide the ring.
    expect(screen.getByTestId('point-0')).toHaveStyle({ strokeWidth: '3' });
    expect(screen.getByTestId('point-0')).toHaveAttribute('data-chart-focused', 'true');
    expect(screen.getByTestId('point-1')).not.toHaveAttribute('data-chart-focused');
  });

  it('returns nothing for an unfocused point', () => {
    expect(dataPointFocusProps(false)).toEqual({});
  });
});

describe('ChartA11yLayer', () => {
  it('exposes a data table alternative', () => {
    render(<Harness />);
    const table = screen.getByRole('table');
    expect(table).toHaveClass('sr-only');
    expect(screen.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'B' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '20' })).toBeInTheDocument();
  });

  it('marks the focused row with aria-current', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    const rows = screen.getAllByRole('row');
    // rows[0] is the header row.
    expect(rows[2]).toHaveAttribute('aria-current', 'true');
    expect(rows[1]).not.toHaveAttribute('aria-current');
  });

  it('holds a polite live region', () => {
    const { container } = render(<Harness />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toHaveClass('sr-only');
    expect(live).toHaveAttribute('aria-atomic', 'true');
  });

  it('caps the table and says so in the caption', () => {
    const rows = Array.from({ length: 250 }, (_, i) => [`row-${i}`, i]);
    const a11y = {
      tableId: 'big-table',
      resolvedTitle: 'Big chart',
      focusedIndex: -1,
      liveMessage: '',
    } as Parameters<typeof ChartA11yLayer>[0]['a11y'];
    render(<ChartA11yLayer a11y={a11y} columns={['Label', 'Value']} rows={rows} />);
    expect(screen.getByRole('table')).toHaveAccessibleName('Big chart (first 200 of 250 rows)');
    expect(screen.getAllByRole('row')).toHaveLength(201);
  });
});
