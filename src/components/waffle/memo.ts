import { memo } from 'react';

/**
 * Why: chart callers overwhelmingly pass `data` as an inline array literal
 * (`data={[{ label: 'A', value: 1 }]}`), which is a fresh reference on every
 * parent render. React's default `memo` comparison is shallow, so it sees a new
 * reference and re-renders — the layout work in visx (scale construction,
 * sankey/treemap/chord layout, SVG element creation) runs again for identical
 * numbers. Structural comparison is O(n) over the data; the re-render it avoids
 * is O(n) with far larger constants, so comparing is the cheaper side.
 *
 * What: the value-level half of {@link chartPropsEqual}. Recurses through arrays
 * and plain objects, and treats everything it cannot compare structurally as
 * unequal.
 *
 * Every uncertain case answers `false` — "assume changed, re-render". That is
 * the pre-memo behaviour, so a wrong guess here costs a wasted render and never
 * a stale chart.
 *
 * Functions compare by reference only, and deliberately: a caller's `onClick`
 * closes over their state, so two textually identical closures are not
 * interchangeable. Skipping a render because the new `onClick` "looks the same"
 * would leave the chart invoking a closure over stale state — see #3.
 *
 * Test: `chartPropsEqual` suites in `__tests__/performance.test.tsx`
 */

/** Depth ceiling. Also what terminates a cyclic structure — the cycle bottoms
 *  out at `false`, which is the safe answer. */
const MAX_DEPTH = 8;

/** Excludes class instances, `Date`, `Map`, DOM nodes — anything whose equality
 *  is not decided by its own enumerable keys. */
const isPlainObject = (value: object): value is Record<string, unknown> => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const valuesEqual = (a: unknown, b: unknown, depth: number): boolean => {
  // Object.is rather than ===, so NaN values inside a dataset compare equal.
  if (Object.is(a, b)) return true;

  if (typeof a === 'function' || typeof b === 'function') return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (depth >= MAX_DEPTH) return false;

  const aIsArray = Array.isArray(a);
  if (aIsArray !== Array.isArray(b)) return false;

  if (aIsArray) {
    const left = a as unknown[];
    const right = b as unknown[];
    if (left.length !== right.length) return false;
    return left.every((item, i) => valuesEqual(item, right[i], depth + 1));
  }

  if (!isPlainObject(a) || !isPlainObject(b)) return false;

  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every(
    key =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      valuesEqual(a[key], b[key], depth + 1),
  );
};

/**
 * Why: one key-driven comparator rather than sixteen hand-maintained per-chart
 * ones. A comparator that names the props it checks silently stops covering any
 * prop added later — the chart would ignore the new prop's changes. Reading the
 * keys off the props objects means a new prop is covered the day it is added.
 *
 * What: `true` when every prop is structurally equal and so the render can be
 * skipped. Compares the union of both key sets, so adding or removing an
 * optional prop counts as a change.
 *
 * Test: `chartPropsEqual` suites in `__tests__/performance.test.tsx`
 */
export const chartPropsEqual = <P extends object>(prev: Readonly<P>, next: Readonly<P>): boolean => {
  if (Object.is(prev, next)) return true;

  const prevKeys = Object.keys(prev);
  if (prevKeys.length !== Object.keys(next).length) return false;

  return prevKeys.every(
    key =>
      Object.prototype.hasOwnProperty.call(next, key) &&
      valuesEqual(
        (prev as Record<string, unknown>)[key],
        (next as Record<string, unknown>)[key],
        0,
      ),
  );
};

/**
 * Why: `memo()` erases generics. Most charts are generic over their row type
 * (`<T,>(props: BarChartProps<T>)`), and `memo` collapses that to a single
 * instantiation, so `<BarChart data={rows} />` would stop inferring `T` from
 * `rows`. The cast restores the original call signature; the runtime value is
 * the real memo component either way, since a cast is compile-time only.
 *
 * What: wraps a chart's root component in `React.memo` with
 * {@link chartPropsEqual} and hands back a value still typed as the component
 * that went in.
 *
 * Test: `preserves generic row-type inference` in `__tests__/performance.test.tsx`
 */
export const memoChart = <C>(component: C): C => {
  const memoized = memo(
    component as Parameters<typeof memo>[0],
    chartPropsEqual,
  );
  // Keeps React DevTools showing "BarChart" rather than "BarChartRoot".
  memoized.displayName = (component as { name?: string }).name?.replace(/Root$/, '');
  return memoized as unknown as C;
};
