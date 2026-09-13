import { useCallback, useMemo } from 'react';
import { AreaStack } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { ChartA11yLayer, ChartSvgDescription } from './ChartA11y';
import { useChartA11y, type ChartA11yProps } from '../../lib/chart-a11y';
import { bisector } from 'd3-array';

export type AreaChartProps<T> = ChartA11yProps & {
  data: T[];
  xKey: keyof T;
  keys: (keyof T)[]; // Keys to stack
  colors?: string[]; // CSS text-color classes
  className?: string;
  width?: number;
  height?: number;

  // Configuration
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGridRows?: boolean;
  showGridColumns?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
};

type AreaChartContentProps<T> = AreaChartProps<T> & {
  width: number;
  height: number;
};

function AreaChartContent<T>({
  data,
  width,
  height,
  xKey,
  keys = [],
  colors = ['#a855f7', '#ec4899'],
  className,
  showXAxis = true,
  showYAxis = true,
  showGridRows = true,
  showGridColumns = false,
  xAxisLabel,
  yAxisLabel,
  margin: customMargin,
  emptyMessage = 'No data to display',
  ariaLabel,
  ariaDescribedby,
  title,
  description,
  keyboardNavigable,
}: AreaChartContentProps<T>) {
  // Config
  const defaultMargin = { top: 40, right: 30, bottom: 50, left: 50 };
  const margin = { ...defaultMargin, ...customMargin };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Every hook below runs unconditionally. `data` is normalised to an array
  // here rather than guarded with an early return, because an early return
  // placed above these hooks changes the hook count between renders.
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Accessors. getX is memoised so the scale memos below actually cache —
  // a fresh closure each render would invalidate them on every pass.
  const getX = useCallback((d: T) => new Date(d[xKey] as string | number | Date), [xKey]);
  const getY0 = (d: unknown) => (d as { [key: string]: number })[0];
  const getY1 = (d: unknown) => (d as { [key: string]: number })[1];

  // Rows whose xKey does not parse to a real date cannot be positioned.
  const validData = useMemo(
    () => safeData.filter(d => !Number.isNaN(getX(d).getTime())),
    [safeData, getX],
  );

  // Scales
  const xScale = useMemo(() => {
    const times = validData.map(d => getX(d).getTime());
    // Math.min/max spread over an empty array yield Infinity/-Infinity, which
    // are truthy — a `|| 0` fallback never fires and the domain is inverted.
    const domain: [number, number] = times.length
      ? [Math.min(...times), Math.max(...times)]
      : [0, 0];
    return scaleTime({ range: [0, xMax], domain });
  }, [xMax, validData, getX]);

  const yScale = useMemo(() => {
    const totals = validData.map(d => keys.reduce((acc, k) => acc + (Number(d[k]) || 0), 0));
    const peak = totals.length ? Math.max(...totals) : 0;
    return scaleLinear<number>({
      range: [yMax, 0],
      round: true,
      domain: [0, peak > 0 ? peak * 1.1 : 100],
      nice: true,
    });
  }, [yMax, validData, keys]);

  // Tooltip - Simplified for AreaStack (just showing nearest X for now)
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

  // A stacked area encodes the total height, so that total is what the summary
  // reports; the per-series numbers live in the announcement and the table.
  const stackTotals = useMemo(
    () => validData.map(d => keys.reduce((acc, k) => acc + (Number(d[k]) || 0), 0)),
    [validData, keys],
  );

  const a11y = useChartA11y({
    chartType: 'Stacked area chart',
    itemCount: validData.length,
    itemNoun: 'point',
    values: stackTotals,
    detail: `${keys.length} stacked series: ${keys.map(String).join(', ')}.`,
    describeItem: index => {
      const d = validData[index];
      if (!d) return '';
      const parts = keys.map(k => `${String(k)}: ${Number(d[k]) || 0}`).join(', ');
      return `${getX(d).toLocaleDateString()}. ${parts}. Total ${stackTotals[index]}`;
    },
    ariaLabel,
    ariaDescribedby,
    title,
    description,
    keyboardNavigable,
  });

  const tableRows = useMemo(
    () =>
      validData.map((d, i) => [
        getX(d).toLocaleDateString(),
        ...keys.map(k => Number(d[k]) || 0),
        stackTotals[i],
      ]),
    [validData, keys, getX, stackTotals],
  );

  const bisectDate = bisector<T, Date>(d => getX(d)).left;

  const handleTooltip = (event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    const { x } = localPoint(event) || { x: 0 };
    const x0 = xScale.invert(x - margin.left);
    const index = bisectDate(validData, x0, 1);
    const d0 = validData[index - 1];
    const d1 = validData[index];
    let d = d0;
    if (d0 && d1) {
      d = x0.valueOf() - getX(d0).valueOf() > getX(d1).valueOf() - x0.valueOf() ? d1 : d0;
    }

    if (d) {
      showTooltip({
        tooltipData: d,
        tooltipLeft: xScale(getX(d)) + margin.left,
        tooltipTop: yScale(0) + margin.top, // Snap to bottom or follow mouse
      });
    }
  };

  if (width < 10 || height < 100) return null;

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
          {(showGridRows || showGridColumns) && (
            <Group>
              {showGridRows && <GridRows scale={yScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border, 214.3 31.8% 91.4%))" />}
              {showGridColumns && <GridColumns scale={xScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border, 214.3 31.8% 91.4%))" />}
            </Group>
          )}

          {showXAxis && (
            <AxisBottom
              top={yMax}
              scale={xScale}
              stroke="hsl(var(--border, 214.3 31.8% 91.4%))"
              tickStroke="hsl(var(--border, 214.3 31.8% 91.4%))"
              label={xAxisLabel}
              numTicks={Math.min(5, validData.length)}
              labelProps={{
                fill: "hsl(var(--muted-foreground, 215.4 16.3% 46.9%))",
                fontSize: 12,
                textAnchor: 'middle',
                dy: 0
              }}
              tickLabelProps={{
                fill: "hsl(var(--muted-foreground, 215.4 16.3% 46.9%))",
                fontSize: 11,
                textAnchor: "middle",
              }}
            />
          )}

          {showYAxis && (
            <AxisLeft
              scale={yScale}
              stroke="transparent"
              tickStroke="hsl(var(--border))"
              label={yAxisLabel}
              labelProps={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: 12,
                textAnchor: 'middle',
                dx: -10
              }}
              tickLabelProps={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: 11,
                textAnchor: "end",
                dx: -4,
                dy: 4,
              }}
            />
          )}

          <AreaStack
            data={validData}
            keys={keys as string[]}
            x={d => xScale(getX(d.data)) ?? 0}
            y0={d => yScale(getY0(d)) ?? 0}
            y1={d => yScale(getY1(d)) ?? 0}
          >
            {({ stacks, path }) =>
              stacks.map((stack, i) => {
                const color = colors[i % colors.length];
                const isHex = color.startsWith('#');
                return (
                  <path
                    key={`stack-${stack.key}`}
                    d={path(stack) || ''}
                    stroke="transparent"
                    fill={isHex ? color : undefined}
                    // Use currentColor to inherit color from text-class only if not hex
                    className={cn("opacity-80 hover:opacity-100 transition-opacity", !isHex && "fill-current", !isHex && color)}
                  />
                )
              })
            }
          </AreaStack>

          {/*
            A stacked area has no per-point shape to outline, so the keyboard
            cursor is drawn as a rule at the focused x position — the same cue
            a crosshair tooltip gives a mouse user.
          */}
          {a11y.focusedIndex >= 0 && validData[a11y.focusedIndex] && (
            <line
              x1={xScale(getX(validData[a11y.focusedIndex]))}
              x2={xScale(getX(validData[a11y.focusedIndex]))}
              y1={0}
              y2={yMax}
              stroke="var(--waffle-focus-color, #0066cc)"
              strokeWidth={2}
              pointerEvents="none"
              data-chart-focus-marker="true"
            />
          )}

          {/* Invisible Overlay for Tooltip */}
          <rect
            x={0}
            y={0}
            width={xMax}
            height={yMax}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={() => hideTooltip()}
          />
        </Group>
      </svg>
      <ChartA11yLayer
        a11y={a11y}
        columns={[xAxisLabel || String(xKey), ...keys.map(String), 'Total']}
        rows={tableRows}
      />
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 50 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-lg">
            <p className="font-semibold text-xs text-muted-foreground mb-1">{getX(tooltipData).toLocaleDateString()}</p>
            {keys.map((key, i) => (
              <div key={key as string} className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full bg-current", colors[i % colors.length])} />
                <span className="text-xs capitalize">{key as string}:</span>
                <span className="font-mono text-xs font-bold">{String(tooltipData[key])}</span>
              </div>
            ))}
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export const AreaChart = <T,>(props: AreaChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <AreaChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
