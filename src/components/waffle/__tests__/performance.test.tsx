import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

/**
 * Counting probe for the memo boundary.
 *
 * Every chart's memoised root renders exactly one `<ParentSize>`, so the number
 * of times this mock runs is the number of times the tree *inside* the memo
 * boundary rendered. Counting a wrapper placed around `<BarChart>` instead would
 * measure the wrapper — which is not memoised and re-renders either way.
 */
const probe = vi.hoisted(() => ({ renders: 0 }));

vi.mock('@visx/responsive', () => ({
  ParentSize: ({
    children,
  }: {
    children: (args: { width: number; height: number }) => React.ReactNode;
  }) => {
    probe.renders++;
    return children({ width: 500, height: 300 });
  },
}));

import { BarChart } from '../BarChart';
import { HeatmapChart } from '../HeatmapChart';
import { SankeyChart } from '../SankeyChart';
import { chartPropsEqual } from '../memo';

const barData = [
  { label: 'A', value: 101 },
  { label: 'B', value: 202 },
];

const heatmapData = [
  { bin: 0, bins: [{ bin: 0, count: 1 }, { bin: 1, count: 2 }] },
  { bin: 1, bins: [{ bin: 0, count: 3 }, { bin: 1, count: 4 }] },
];

const sankeyData = {
  nodes: [{ name: 'A' }, { name: 'B' }],
  links: [{ source: 0, target: 1, value: 5 }],
};

beforeEach(() => {
  probe.renders = 0;
});

describe('React.memo optimisation: renders skipped', () => {
  it('skips the BarChart re-render when a new-but-equal data array arrives', () => {
    const { rerender } = render(<BarChart data={barData} xKey="label" yKey="value" />);
    expect(probe.renders).toBe(1);

    // A fresh array literal with identical contents — what a caller writing
    // `data={[...]}` inline produces on every parent render.
    rerender(
      <BarChart
        data={[
          { label: 'A', value: 101 },
          { label: 'B', value: 202 },
        ]}
        xKey="label"
        yKey="value"
      />,
    );

    expect(probe.renders).toBe(1);
  });

  it('skips the HeatmapChart re-render across nested bin arrays', () => {
    const { rerender } = render(<HeatmapChart data={heatmapData} />);
    expect(probe.renders).toBe(1);

    rerender(
      <HeatmapChart
        data={[
          { bin: 0, bins: [{ bin: 0, count: 1 }, { bin: 1, count: 2 }] },
          { bin: 1, bins: [{ bin: 0, count: 3 }, { bin: 1, count: 4 }] },
        ]}
      />,
    );

    expect(probe.renders).toBe(1);
  });

  it('skips the SankeyChart re-render across an object-of-arrays graph', () => {
    const { rerender } = render(<SankeyChart data={sankeyData} />);
    expect(probe.renders).toBe(1);

    rerender(
      <SankeyChart
        data={{
          nodes: [{ name: 'A' }, { name: 'B' }],
          links: [{ source: 0, target: 1, value: 5 }],
        }}
      />,
    );

    expect(probe.renders).toBe(1);
  });

  it('skips the re-render when a stateful parent re-renders around a stable chart', async () => {
    const user = userEvent.setup();

    function Parent() {
      const [count, setCount] = useState(0);
      return (
        <div>
          <button onClick={() => setCount(c => c + 1)}>bump</button>
          <span data-testid="count">{count}</span>
          <BarChart data={barData} xKey="label" yKey="value" />
        </div>
      );
    }

    render(<Parent />);
    expect(probe.renders).toBe(1);

    await user.click(screen.getByRole('button', { name: 'bump' }));
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    // The parent re-rendered; the chart did not.
    expect(probe.renders).toBe(1);
  });
});

describe('React.memo optimisation: renders still happen when they must', () => {
  it('re-renders the BarChart when a data value changes', () => {
    const { rerender } = render(<BarChart data={barData} xKey="label" yKey="value" />);
    expect(probe.renders).toBe(1);

    rerender(
      <BarChart
        data={[
          { label: 'A', value: 999 },
          { label: 'B', value: 202 },
        ]}
        xKey="label"
        yKey="value"
      />,
    );

    expect(probe.renders).toBe(2);
  });

  it('re-renders the BarChart when a row is appended', () => {
    const { rerender } = render(<BarChart data={barData} xKey="label" yKey="value" />);
    rerender(
      <BarChart data={[...barData, { label: 'C', value: 303 }]} xKey="label" yKey="value" />,
    );
    expect(probe.renders).toBe(2);
  });

  it('re-renders the BarChart when a primitive prop changes', () => {
    const { rerender } = render(<BarChart data={barData} xKey="label" yKey="value" />);
    rerender(<BarChart data={barData} xKey="label" yKey="value" barColor="#ff0000" />);
    expect(probe.renders).toBe(2);
  });

  it('re-renders the BarChart when a callback identity changes', () => {
    const { rerender } = render(
      <BarChart data={barData} xKey="label" yKey="value" onClick={() => {}} />,
    );
    rerender(<BarChart data={barData} xKey="label" yKey="value" onClick={() => {}} />);

    // Two textually identical closures are NOT interchangeable — each closes
    // over its own render's state. Bailing here would leave the chart holding a
    // stale closure.
    expect(probe.renders).toBe(2);
  });

  it('invokes the latest onClick closure rather than a stale one', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [count, setCount] = useState(0);
      const [seen, setSeen] = useState<number | null>(null);
      return (
        <div>
          <button onClick={() => setCount(c => c + 1)}>bump</button>
          <span data-testid="seen">{seen === null ? 'none' : String(seen)}</span>
          <BarChart
            data={barData}
            xKey="label"
            yKey="value"
            showGridRows={false}
            onClick={() => setSeen(count)}
          />
        </div>
      );
    }

    const { container } = render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'bump' }));
    await user.click(container.querySelectorAll('rect')[0]);

    // A stale closure would report the count captured at first render, 0.
    expect(screen.getByTestId('seen')).toHaveTextContent('1');
  });
});

describe('chartPropsEqual', () => {
  it('treats the same object reference as equal', () => {
    const props = { data: barData };
    expect(chartPropsEqual(props, props)).toBe(true);
  });

  it('compares nested arrays and objects structurally', () => {
    expect(
      chartPropsEqual(
        { data: [{ a: [1, 2], b: { c: 3 } }] },
        { data: [{ a: [1, 2], b: { c: 3 } }] },
      ),
    ).toBe(true);
  });

  it('reports a nested scalar change', () => {
    expect(
      chartPropsEqual({ data: [{ b: { c: 3 } }] }, { data: [{ b: { c: 4 } }] }),
    ).toBe(false);
  });

  it('reports a differing key count', () => {
    expect(chartPropsEqual({ a: 1 } as Record<string, number>, { a: 1, b: 2 })).toBe(false);
  });

  it('reports a renamed key with a matching count', () => {
    expect(chartPropsEqual({ a: 1 } as Record<string, number>, { b: 1 })).toBe(false);
  });

  it('treats NaN as equal to NaN so a gap in a dataset does not force a render', () => {
    expect(chartPropsEqual({ data: [NaN] }, { data: [NaN] })).toBe(true);
  });

  it('distinguishes an array from an object with the same keys', () => {
    expect(chartPropsEqual({ v: [1] as unknown }, { v: { 0: 1 } })).toBe(false);
  });

  it('reports undefined against a missing key as a change', () => {
    expect(
      chartPropsEqual({ a: undefined } as Record<string, unknown>, {} as Record<string, unknown>),
    ).toBe(false);
  });

  it('compares functions by reference', () => {
    const fn = () => {};
    expect(chartPropsEqual({ onClick: fn }, { onClick: fn })).toBe(true);
    expect(chartPropsEqual({ onClick: () => {} }, { onClick: () => {} })).toBe(false);
  });

  it('falls back to reference equality for non-plain objects', () => {
    // Dates are not compared field-by-field; two equal-valued Dates report as
    // changed, which costs a render rather than risking a stale chart.
    expect(chartPropsEqual({ d: new Date(0) }, { d: new Date(0) })).toBe(false);
  });

  it('terminates on a cyclic structure instead of overflowing the stack', () => {
    const left: Record<string, unknown> = {};
    left.self = left;
    const right: Record<string, unknown> = {};
    right.self = right;
    expect(chartPropsEqual({ v: left }, { v: right })).toBe(false);
  });
});

describe('TypeScript surface', () => {
  it('preserves generic row-type inference through memo', () => {
    const rows = [{ label: 'A', value: 1 }];
    // `xKey` is `keyof T`. If memo had collapsed the generic, `T` would widen
    // and this would stop type-checking — the assertion is that `tsc` accepts
    // the file, not the runtime value.
    const element = <BarChart data={rows} xKey="label" yKey="value" />;
    expect(element).toBeTruthy();
  });
});
