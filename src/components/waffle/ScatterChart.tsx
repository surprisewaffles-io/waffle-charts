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

// Types
export type ScatterChartProps<T> = ChartA11yProps & {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  className?: string; // Wrapper class
  pointClassName?: string; // Point color/style (Tailwind class)
  pointColor?: string; // Direct color value (hex, rgb, etc.) - takes precedence over pointClassName
  pointRadius?: number; // Point size
  width?: number;
  height?: number;
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
};

// Internal component
type ScatterChartContentProps<T> = ScatterChartProps<T> & {
  width: number;
  height: number;
};

function ScatterChartContent<T>({
  data,
  width,
  height,
  xKey,
  yKey,
  className,
  pointClassName,
  pointColor,
  pointRadius = 6,
  emptyMessage = 'No data to display',
  ariaLabel,
  ariaDescribedby,
  title,
  description,
  keyboardNavigable,
}: ScatterChartContentProps<T>) {
  // Config
  const margin = { top: 40, right: 30, bottom: 50, left: 50 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Determine active color mode
  // If pointColor is provided, use it.
  // If pointClassName is provided, use it (activeColor is undefined).
  // If NEITHER is provided, default to the purple hex palette.
  const activeColor = pointColor ?? (pointClassName ? undefined : "#a855f7");

  // Every hook below runs unconditionally. `data` is normalised to an array
  // here rather than guarded with an early return, because an early return
  // placed above these hooks changes the hook count between renders.
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Accessors are memoised so the scale memos below actually cache — a fresh
  // closure each render would invalidate them on every pass.
  const getX = useCallback((d: T) => Number(d[xKey]), [xKey]);
  const getY = useCallback((d: T) => Number(d[yKey]), [yKey]);

  // Rows without two finite coordinates cannot be positioned.
  const validData = useMemo(
    () => safeData.filter(d => Number.isFinite(getX(d)) && Number.isFinite(getY(d))),
    [safeData, getX, getY],
  );

  // Scales
  const xScale = useMemo(() => {
    // Math.max spread over an empty array yields -Infinity, which is truthy —
    // a `|| 0` fallback never fires and the domain becomes unusable.
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

  const a11yValues = useMemo(() => validData.map(getY), [validData, getY]);

  const a11y = useChartA11y({
    chartType: 'Scatter plot',
    itemCount: validData.length,
    itemNoun: 'point',
    values: a11yValues,
    describeItem: index => {
      const d = validData[index];
      return d ? `${String(xKey)} ${getX(d)}, ${String(yKey)} ${getY(d)}` : '';
    },
    ariaLabel,
    ariaDescribedby,
    title,
    description,
    keyboardNavigable,
  });

  const tableRows = useMemo(
    () => validData.map(d => [getX(d), getY(d)]),
    [validData, getX, getY],
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
          <AxisBottom
            top={yMax}
            scale={xScale}
            stroke="hsl(var(--border, 214.3 31.8% 91.4%))"
            tickStroke="hsl(var(--border, 214.3 31.8% 91.4%))"
            tickLabelProps={{
              fill: "hsl(var(--muted-foreground, 215.4 16.3% 46.9%))",
              fontSize: 11,
              textAnchor: "middle",
            }}
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
          {validData.map((d, i) => {
            const cx = xScale(getX(d));
            const cy = yScale(getY(d));
            return (
              <Circle
                key={`point-${i}`}
                cx={cx}
                cy={cy}
                r={pointRadius}
                fill={activeColor}
                {...dataPointFocusProps(a11y.focusedIndex === i)}
                className={cn("transition-all duration-300 hover:r-8 hover:opacity-80 cursor-pointer", !activeColor && pointClassName)}
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
        columns={[String(xKey), String(yKey)]}
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
              <span className="font-semibold">{String(getY(tooltipData))}</span>
              <span className="text-xs text-muted-foreground">{String(getX(tooltipData))}</span>
            </div>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

const ScatterChartRoot = <T,>(props: ScatterChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <ScatterChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}

/** Memoised so a parent re-render with unchanged props skips the visx layout
 *  below. See `./memo` for what "unchanged" means. (#3) */
export const ScatterChart = memoChart(ScatterChartRoot);
