import { useCallback, useMemo } from 'react';
import { memoChart } from './memo';
import { Group } from '@visx/group';
import { Circle } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Grid } from '@visx/grid';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { ChartA11yLayer, ChartSvgDescription } from './ChartA11y';
import {
  dataPointFocusProps,
  useChartA11y,
  type ChartA11yProps,
} from '../../lib/chart-a11y';
import {
  CHART_A11Y_BASELINE,
  MEMOIZED_PERFORMANCE,
  type ChartMetadata,
} from './metadata-types';

// Types
export type BubbleChartProps<T> = ChartA11yProps & {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  zKey: keyof T; // Radius
  className?: string; // Wrapper class
  pointClassName?: string; // Point color/style (Tailwind class)
  bubbleColor?: string; // Direct color value (hex, rgb) - takes precedence
  colorScheme?: string[]; // Array of colors for multi-bubble coloring
  width?: number;
  height?: number;
  minRadius?: number;
  maxRadius?: number;
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
};

// Internal component
type BubbleChartContentProps<T> = BubbleChartProps<T> & {
  width: number;
  height: number;
};

function BubbleChartContent<T>({
  data,
  width,
  height,
  xKey,
  yKey,
  zKey,
  className,
  pointClassName = "fill-primary/50", // Use opacity for bubbles
  bubbleColor = "#a855f7", // Default bubble color
  colorScheme,
  minRadius = 4,
  maxRadius = 30,
  emptyMessage = 'No data to display',
  ariaLabel,
  ariaDescribedby,
  title,
  description,
  keyboardNavigable,
}: BubbleChartContentProps<T>) {
  // Config
  const margin = { top: 40, right: 30, bottom: 50, left: 50 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Every hook below runs unconditionally. `data` is normalised to an array
  // here rather than guarded with an early return, because an early return
  // placed above these hooks changes the hook count between renders.
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Accessors are memoised so the scale memos below actually cache — a fresh
  // closure each render would invalidate them on every pass.
  const getX = useCallback((d: T) => Number(d[xKey]), [xKey]);
  const getY = useCallback((d: T) => Number(d[yKey]), [yKey]);
  const getZ = useCallback((d: T) => Number(d[zKey]), [zKey]);

  // A bubble needs all three coordinates to be positioned and sized.
  const validData = useMemo(
    () =>
      safeData.filter(
        d => Number.isFinite(getX(d)) && Number.isFinite(getY(d)) && Number.isFinite(getZ(d)),
      ),
    [safeData, getX, getY, getZ],
  );

  // Scales
  const xScale = useMemo(() => {
    // Math.min/max spread over an empty array yield Infinity/-Infinity, which
    // are truthy — a `|| 0` fallback never fires and the domain is unusable.
    const peak = validData.length ? Math.max(...validData.map(getX)) : 0;
    return scaleLinear<number>({
      range: [0, xMax],
      round: true,
      domain: [0, peak > 0 ? peak * 1.1 : 1], // Add padding
    });
  }, [xMax, validData, getX]);

  const yScale = useMemo(() => {
    const peak = validData.length ? Math.max(...validData.map(getY)) : 0;
    return scaleLinear<number>({
      range: [yMax, 0],
      round: true,
      domain: [0, peak > 0 ? peak * 1.1 : 1],
    });
  }, [yMax, validData, getY]);

  const zScale = useMemo(() => {
    const sizes = validData.map(getZ);
    const domain: [number, number] = sizes.length
      ? [Math.min(...sizes), Math.max(...sizes)]
      : [0, 1];
    return scaleLinear<number>({
      range: [minRadius, maxRadius],
      round: true,
      domain,
    });
  }, [minRadius, maxRadius, validData, getZ]);

  // Tooltip
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<T>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  // The bubble's size, not its position, is the measure a reader most needs
  // spoken, so the generated summary covers the z values.
  const a11yValues = useMemo(() => validData.map(getZ), [validData, getZ]);

  const a11y = useChartA11y({
    chartType: 'Bubble chart',
    itemCount: validData.length,
    itemNoun: 'bubble',
    values: a11yValues,
    describeItem: index => {
      const d = validData[index];
      return d
        ? `${String(xKey)} ${getX(d)}, ${String(yKey)} ${getY(d)}, ${String(zKey)} ${getZ(d)}`
        : '';
    },
    ariaLabel,
    ariaDescribedby,
    title,
    description,
    keyboardNavigable,
  });

  const tableRows = useMemo(
    () => validData.map(d => [getX(d), getY(d), getZ(d)]),
    [validData, getX, getY, getZ],
  );

  if (width < 10) return null;

  // Guards sit below every hook so the hook count never varies between renders.
  if (validData.length === 0) {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center justify-center text-sm text-muted-foreground",
          className,
        )}
        style={{ width, height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <svg
        {...a11y.svgProps}
        ref={containerRef}
        width={width}
        height={height}
        className={cn('overflow-visible', a11y.svgProps.className)}
      >
        <ChartSvgDescription
          titleId={a11y.titleId}
          descId={a11y.descId}
          title={a11y.resolvedTitle}
          description={a11y.resolvedDescription}
        />
        <Group left={margin.left} top={margin.top}>
          <Grid
            xScale={xScale}
            yScale={yScale}
            width={xMax}
            height={yMax}
            stroke="hsl(var(--border, 214.3 31.8% 91.4%))"
            strokeOpacity={0.4}
          />
          <AxisLeft
            scale={yScale}
            stroke="transparent"
            tickStroke="hsl(var(--border, 214.3 31.8% 91.4%))"
            tickLabelProps={{
              fill: "hsl(var(--muted-foreground, 215.4 16.3% 46.9%))",
              fontSize: 11,
              textAnchor: "end",
              dx: -4,
              dy: 4,
            }}
          />
          <AxisBottom
            top={yMax}
            scale={xScale}
            stroke="hsl(var(--border))"
            tickStroke="hsl(var(--border))"
            tickLabelProps={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              textAnchor: "middle",
            }}
          />
          {validData.map((d, i) => {
            const cx = xScale(getX(d));
            const cy = yScale(getY(d));
            const r = zScale(getZ(d));
            // Determine fill color: colorScheme (per bubble) > bubbleColor (single) > pointClassName
            const fillColor = colorScheme ? colorScheme[i % colorScheme.length] : bubbleColor;

            return (
              <Circle
                key={`point-${i}`}
                cx={cx}
                cy={cy}
                r={r}
                fill={fillColor}
                {...dataPointFocusProps(a11y.focusedIndex === i)}
                className={cn("transition-all duration-300 hover:opacity-80 cursor-pointer stroke-background stroke-1", !fillColor && pointClassName)}
                onMouseEnter={() => {
                  showTooltip({
                    tooltipData: d,
                    tooltipLeft: cx + margin.left, // absolute relative to container
                    tooltipTop: cy + margin.top, // absolute relative to container
                  });
                }}
                onMouseLeave={() => hideTooltip()}
              />
            );
          })}
        </Group>
      </svg>
      <ChartA11yLayer
        a11y={a11y}
        columns={[String(xKey), String(yKey), String(zKey)]}
        rows={tableRows}
      />
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 100 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-xs text-muted-foreground">Values</span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1">
                <span>X:</span>
                <span className="font-mono">{String(getX(tooltipData))}</span>
                <span>Y:</span>
                <span className="font-mono">{String(getY(tooltipData))}</span>
                <span>Z:</span>
                <span className="font-mono">{String(getZ(tooltipData))}</span>
              </div>
            </div>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

const BubbleChartRoot = <T,>(props: BubbleChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <BubbleChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}

/** Memoised so a parent re-render with unchanged props skips the visx layout
 *  below. See `./memo` for what "unchanged" means. (#3) */
export const BubbleChart = memoChart(BubbleChartRoot);

/** Machine-readable description of this chart, for agents and validation. (#10) */
export const BubbleChartMeta = {
  name: 'BubbleChart',
  category: 'relationship',
  description:
    'A scatter plot with a third variable encoded as circle radius, so three numeric measures read at once.',
  dataRequirements: {
    minRows: 2,
    maxRecommended: 200,
    kind: 'rows',
    shape: 'Array<{ [xKey]: number; [yKey]: number; [zKey]: number }>',
    requiredFields: ['x', 'y', 'z'],
    fixedFieldNames: false,
    requiredProps: ['data', 'xKey', 'yKey', 'zKey'],
    optionalProps: ['minRadius', 'maxRadius', 'pointClassName', 'className', 'emptyMessage'],
    notes:
      'zKey drives radius between minRadius and maxRadius. All three values must be finite or the row is dropped. Radius encodes area poorly for wide ranges — keep zKey within roughly two orders of magnitude.',
  },
  capabilities: ['responsive', 'tooltip', 'axes', 'grid', 'numeric', 'empty-state', 'custom-colors'],
  complexity: 'moderate',
  accessibility: CHART_A11Y_BASELINE,
  performance: MEMOIZED_PERFORMANCE,
} as const satisfies ChartMetadata;

export type BubbleChartMetadata = typeof BubbleChartMeta;
