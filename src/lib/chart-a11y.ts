/**
 * Why: every chart in this library draws to a bare `<svg>`, which a screen
 * reader reports as nothing at all, and which the keyboard cannot reach. That
 * makes the charts unusable for anyone not pointing a mouse at them — the
 * WCAG 2.1 Level AA failure tracked in #5.
 *
 * What: one place that turns a chart's data into the four things WCAG asks
 * for — a name (`aria-label`), a description (`<desc>` plus a generated
 * summary), a keyboard-reachable focus model with arrow-key traversal, and a
 * tabular alternative the reader can inspect row by row. Charts call
 * `useChartA11y` once and spread the props it returns; nothing about the
 * drawing code changes.
 *
 * The markup those props pair with lives in
 * `src/components/waffle/ChartA11y.tsx` — Fast Refresh only tracks a module
 * that exports components and nothing else, and this one exports the hook.
 *
 * Test: `src/lib/__tests__/chart-a11y.test.tsx`
 */
import { useCallback, useId, useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent, SVGProps } from 'react';
import { cn } from './utils';

/**
 * Accessibility options every chart accepts. Spread into a chart's own props
 * type so the whole library presents one vocabulary.
 */
export type ChartA11yProps = {
  /** Accessible name for the chart. Falls back to a generated summary. */
  ariaLabel?: string;
  /** Id of an element elsewhere on the page that describes the chart. */
  ariaDescribedby?: string;
  /** Human title rendered into the SVG's `<title>`. */
  title?: string;
  /** Long description rendered into the SVG's `<desc>`. Falls back to a generated one. */
  description?: string;
  /** Set false to make the chart inert to Tab and the arrow keys. Defaults to true. */
  keyboardNavigable?: boolean;
};

/** Focus ring colour, overridable per page via the CSS custom property. */
const FOCUS_COLOR = 'var(--waffle-focus-color, #0066cc)';

/**
 * Tailwind utilities for the chart-level focus ring.
 *
 * `focus-visible` rather than `focus` keeps a mouse click from leaving an
 * outline behind, and every current browser supports it.
 *
 * `outline-solid` is not redundant. Tailwind v4 emits `outline-style:
 * var(--tw-outline-style)` for `outline-2`, and `outline-none` sets that
 * variable to `none` — pairing the two yields a ring with a width, a colour,
 * an offset, and no style, which paints nothing at all. Stating the style
 * explicitly is what makes the ring appear.
 */
const FOCUS_RING_CLASS = cn(
  'focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2',
  'focus-visible:outline-[color:var(--waffle-focus-color,#0066cc)]',
);

/**
 * Props that draw a focus ring on one datum. Deliberately not
 * `SVGProps<SVGElement>`: that type carries `ref`, whose element is invariant,
 * so spreading it onto a `<rect>` or `<circle>` fails to typecheck.
 */
export type DataPointFocusProps = {
  'data-chart-focused'?: 'true';
  style?: CSSProperties;
};

/**
 * Why: several charts style their shapes with Tailwind stroke utilities
 * (`stroke-background`, `stroke-1`). A CSS rule beats an SVG presentation
 * attribute at any specificity, so a `stroke=` attribute would lose and the
 * focused datum would look no different from its neighbours.
 *
 * What: marks the keyboard cursor's current datum with an inline style, which
 * outranks both the presentation attribute and the class. An unfocused datum
 * gets an empty object, leaving the chart's own styling untouched.
 *
 * The stroke paints over the fill rather than under it. SVG centres a stroke
 * on the shape's edge, so painting it under the fill would hide the inner half
 * and leave a 1.5px line — too thin to read as a focus indicator on a dense
 * chart. Covering 1.5px of a datum is the cheaper trade.
 *
 * Test: `strokes only the focused data point`
 */
export function dataPointFocusProps(isFocused: boolean): DataPointFocusProps {
  if (!isFocused) return {};
  return {
    'data-chart-focused': 'true',
    style: {
      stroke: FOCUS_COLOR,
      strokeWidth: 3,
      vectorEffect: 'non-scaling-stroke',
    },
  };
}

/** Formats a number for a spoken summary without trailing noise. */
const speakNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

/**
 * Reduces a series to the range-and-average sentence screen-reader users get
 * in place of seeing the shape. Returns null when nothing is summarisable, so
 * callers can omit the sentence rather than speak "Range: NaN to NaN".
 */
export function summarizeValues(values: readonly number[]): string | null {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return null;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const avg = finite.reduce((sum, v) => sum + v, 0) / finite.length;
  return `Range: ${speakNumber(min)} to ${speakNumber(max)}. Average: ${speakNumber(avg)}.`;
}

export type DescribeChartOptions = {
  /** Sentence-cased noun phrase, e.g. "Bar chart". */
  chartType: string;
  /** How many data points the chart drew. */
  itemCount: number;
  /** Noun for one item, e.g. "bar", "slice", "node". Defaults to "data point". */
  itemNoun?: string;
  /** Values behind the points, used for the range-and-average sentence. */
  values?: readonly number[];
  /** Extra clause appended verbatim, e.g. "3 series." */
  detail?: string;
};

/** Pluralises an English noun well enough for the nouns this library uses. */
const plural = (noun: string, count: number): string =>
  count === 1 ? noun : noun.endsWith('s') || noun.endsWith('x') ? `${noun}es` : `${noun}s`;

/**
 * Builds the fallback long description: what kind of chart, how much is in it,
 * and where the numbers sit. Callers override it wholesale via `description`.
 */
export function buildChartDescription({
  chartType,
  itemCount,
  itemNoun = 'data point',
  values,
  detail,
}: DescribeChartOptions): string {
  const parts = [`${chartType} with ${itemCount} ${plural(itemNoun, itemCount)}.`];
  if (detail) parts.push(detail);
  const summary = values ? summarizeValues(values) : null;
  if (summary) parts.push(summary);
  return parts.join(' ');
}

export type UseChartA11yOptions = ChartA11yProps &
  DescribeChartOptions & {
    /** Speaks one datum into the live region when the keyboard lands on it. */
    describeItem?: (index: number) => string;
    /** Invoked on Enter or Space over the focused datum. */
    onActivate?: (index: number) => void;
  };

export type ChartA11y = {
  /** Id of the `<title>` element inside the SVG. */
  titleId: string;
  /** Id of the `<desc>` element inside the SVG. */
  descId: string;
  /** Id of the off-screen data table the SVG points at with `aria-details`. */
  tableId: string;
  /** The title actually rendered, after falling back to the chart type. */
  resolvedTitle: string;
  /** The description actually rendered, after falling back to the generated one. */
  resolvedDescription: string;
  /** Index the keyboard cursor sits on, or -1 when nothing is focused. */
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  /** Sentence the polite live region currently holds. */
  liveMessage: string;
  /** Spread onto the chart's root `<svg>`. */
  svgProps: SVGProps<SVGSVGElement>;
};

/**
 * Why: WCAG 2.1 AA wants a chart to have a name, a description, a keyboard
 * path through its data, and a non-visual alternative. Hand-rolling those four
 * in sixteen components would drift apart within a release.
 *
 * What: derives the ids, the generated label and description, and the
 * arrow-key state machine, and hands back a props bag for the `<svg>`. The
 * SVG carries `role="img"`, which hides its shapes from assistive tech, so the
 * per-datum announcements go through the live region that `ChartA11yLayer`
 * renders outside the SVG instead.
 *
 * Keys handled: Right/Down advance, Left/Up retreat, Home and End jump to the
 * ends, Enter and Space activate, Escape clears. Traversal wraps, which keeps
 * a long series reachable in either direction without counting presses.
 *
 * Test: `announces the focused point`, `wraps from the last point to the first`,
 * `activates the focused point on Enter`
 */
export function useChartA11y({
  chartType,
  itemCount,
  itemNoun = 'data point',
  values,
  detail,
  ariaLabel,
  ariaDescribedby,
  title,
  description,
  keyboardNavigable = true,
  describeItem,
  onActivate,
}: UseChartA11yOptions): ChartA11y {
  const reactId = useId();
  const titleId = `${reactId}-title`;
  const descId = `${reactId}-desc`;
  const tableId = `${reactId}-table`;

  const [focusedIndex, setFocusedIndex] = useState(-1);

  const resolvedTitle = title ?? chartType;

  const generatedDescription = useMemo(
    () => buildChartDescription({ chartType, itemCount, itemNoun, values, detail }),
    [chartType, itemCount, itemNoun, values, detail],
  );
  const resolvedDescription = description ?? generatedDescription;
  const resolvedLabel = ariaLabel ?? resolvedDescription;

  const liveMessage = useMemo(() => {
    if (focusedIndex < 0 || focusedIndex >= itemCount) return '';
    const item = describeItem?.(focusedIndex);
    const position = `${focusedIndex + 1} of ${itemCount}`;
    return item ? `${position}. ${item}` : position;
  }, [focusedIndex, itemCount, describeItem]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<SVGSVGElement>) => {
      if (!keyboardNavigable || itemCount === 0) return;

      const step = (delta: number) =>
        setFocusedIndex(prev => {
          // A first arrow press with nothing focused should land on an end of
          // the series rather than on whatever index modular arithmetic on -1
          // happens to produce.
          if (prev < 0) return delta > 0 ? 0 : itemCount - 1;
          return (prev + delta + itemCount) % itemCount;
        });

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          step(1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          step(-1);
          break;
        case 'Home':
          setFocusedIndex(0);
          break;
        case 'End':
          setFocusedIndex(itemCount - 1);
          break;
        case 'Enter':
        case ' ':
          if (focusedIndex >= 0) onActivate?.(focusedIndex);
          else return;
          break;
        case 'Escape':
          if (focusedIndex < 0) return;
          setFocusedIndex(-1);
          break;
        default:
          return;
      }

      // Only reached for a key the chart consumed, so page scrolling and the
      // browser's own arrow-key behaviour survive every other key.
      event.preventDefault();
      event.stopPropagation();
    },
    [keyboardNavigable, itemCount, focusedIndex, onActivate],
  );

  const svgProps = useMemo<SVGProps<SVGSVGElement>>(
    () => ({
      role: 'img',
      'aria-label': resolvedLabel,
      'aria-describedby': ariaDescribedby ?? descId,
      'aria-details': tableId,
      tabIndex: keyboardNavigable ? 0 : undefined,
      onKeyDown: keyboardNavigable ? handleKeyDown : undefined,
      onBlur: keyboardNavigable ? () => setFocusedIndex(-1) : undefined,
      className: keyboardNavigable ? FOCUS_RING_CLASS : undefined,
    }),
    [resolvedLabel, ariaDescribedby, descId, tableId, keyboardNavigable, handleKeyDown],
  );

  return {
    titleId,
    descId,
    tableId,
    resolvedTitle,
    resolvedDescription,
    focusedIndex,
    setFocusedIndex,
    liveMessage,
    svgProps,
  };
}
