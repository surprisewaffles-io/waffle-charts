import { useCallback, useMemo } from 'react';
import { Bar, BarStack, BarGroup } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { GridRows, GridColumns } from '@visx/grid';
import { ChartA11yLayer, ChartSvgDescription } from './ChartA11y';
import {
  dataPointFocusProps,
  useChartA11y,
  type ChartA11yProps,
} from '../../lib/chart-a11y';

// Types
export type BarChartProps<T> = ChartA11yProps & {
  data: T[];
  xKey: keyof T;
  yKey?: keyof T; // Optional if using keys

  // Advanced Config
  variant?: 'simple' | 'stacked' | 'grouped';
  keys?: string[]; // Keys for stacked/grouped
  colors?: string[]; // Array of colors corresponding to keys

  className?: string;
  barColor?: string; // Default color for simple bar
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
  yDomain?: [number, number];
  tickFormat?: (value: string, index: number) => string;
  onClick?: (data: T) => void;
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
};

/**
 * Discriminated by variant so the tooltip body narrows without casts. The
 * multi-series arms carry the resolved value rather than the visx bar datum,
 * whose generic row type cannot be indexed by an arbitrary key.
 */
type BarTooltipData<T> =
  | { type: 'simple'; d: T }
  | { type: 'stacked'; color?: string; key: string; value: number }
  | { type: 'grouped'; color?: string; key: string; value: number };

/** Reads an arbitrary string key off a generic row as a number. */
const readKey = <T,>(d: T, key: string): number =>
  Number((d as unknown as Record<string, unknown>)[key]) || 0;

// Internal component with required dimensions
type BarChartContentProps<T> = BarChartProps<T> & {
  width: number;
  height: number;
};

function BarChartContent<T>({
  data,
  width,
  height,
  xKey,
  yKey,
  variant = 'simple',
  keys = [],
  colors: palette = ['#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'],
  className,
  barColor = "#a855f7",
  showXAxis = true,
  showYAxis = true,
  showGridRows = true,
  showGridColumns = false,
  xAxisLabel,
  yAxisLabel,
  margin: customMargin,
  yDomain,
  tickFormat,
  onClick,
  emptyMessage = 'No data to display',
  ariaLabel,
  ariaDescribedby,
  title,
  description,
  keyboardNavigable,
}: BarChartContentProps<T>) {
  // Config
  const defaultMargin = { top: 40, right: 30, bottom: 50, left: 50 };
  const margin = { ...defaultMargin, ...customMargin };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Every hook below runs unconditionally. `data` is normalised to an array
  // here rather than guarded with an early return, because an early return
  // placed above these hooks changes the hook count between renders.
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Accessors are memoised so the scale memos below actually cache — a fresh
  // closure each render would invalidate them on every pass.
  const getX = useCallback((d: T) => String(d[xKey]), [xKey]);
  // Helper for simple bar
  const getY = useCallback((d: T) => (yKey ? Number(d[yKey]) : 0), [yKey]);

  // Effective Keys and Colors
  const effectiveKeys = useMemo(
    () => (keys.length > 0 ? keys : yKey ? [String(yKey)] : []),
    [keys, yKey],
  );

  // A row is plottable when it carries a finite height for the active variant.
  const validData = useMemo(() => {
    if (variant === 'simple') return safeData.filter(d => Number.isFinite(getY(d)));
    return safeData.filter(d => effectiveKeys.some(k => Number.isFinite(readKey(d, k))));
  }, [safeData, variant, effectiveKeys, getY]);

  // Scales
  const xScale = useMemo(
    () =>
      scaleBand<string>({
        range: [0, xMax],
        round: true,
        domain: validData.map(getX),
        padding: 0.4,
      }),
    [xMax, validData, getX],
  );

  // Grouped Scale (Sub-scale)
  const x1Scale = useMemo(
    () =>
      scaleBand<string>({
        domain: effectiveKeys,
        padding: 0.1,
        range: [0, xScale.bandwidth()],
      }),
    [xScale, effectiveKeys],
  );

  const yScale = useMemo(
    () => {
      // Math.max spread over an empty array yields -Infinity, which is truthy —
      // a `|| 0` fallback never fires and the domain becomes unusable. Every
      // branch below therefore reduces over a list it has already measured.
      let heights: number[];
      if (variant === 'stacked') {
        // Calculate max stack
        heights = validData.map(d => effectiveKeys.reduce((acc, k) => acc + readKey(d, k), 0));
      } else if (variant === 'grouped') {
        // Calculate max group value
        heights = validData.flatMap(d => effectiveKeys.map(k => readKey(d, k)));
      } else {
        // Simple
        heights = validData.map(getY);
      }
      const finite = heights.filter(Number.isFinite);
      const maxY = finite.length ? Math.max(...finite) : 0;

      return scaleLinear<number>({
        range: [yMax, 0],
        round: true,
        domain: yDomain || [0, maxY > 0 ? maxY * 1.1 : 100],
      });
    },
    [yMax, validData, variant, effectiveKeys, yDomain, getY],
  );

  // Tooltip
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<BarTooltipData<T>>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  const isMultiSeries = variant === 'stacked' || variant === 'grouped';

  // One accessible "data point" is one category, not one rectangle: a grouped
  // chart draws several bars per category but a reader traverses categories.
  const a11yValues = useMemo(
    () =>
      isMultiSeries
        ? validData.map(d => effectiveKeys.reduce((acc, k) => acc + readKey(d, k), 0))
        : validData.map(getY),
    [isMultiSeries, validData, effectiveKeys, getY],
  );

  const a11y = useChartA11y({
    chartType: 'Bar chart',
    itemCount: validData.length,
    itemNoun: 'bar',
    values: a11yValues,
    detail: isMultiSeries ? `${effectiveKeys.length} series.` : undefined,
    describeItem: index => {
      const d = validData[index];
      if (!d) return '';
      return isMultiSeries
        ? `${getX(d)}. ${effectiveKeys.map(k => `${k}: ${readKey(d, k)}`).join(', ')}`
        : `${getX(d)}: ${getY(d)}`;
    },
    onActivate: index => {
      const d = validData[index];
      if (d) onClick?.(d);
    },
    ariaLabel,
    ariaDescribedby,
    title,
    description,
    keyboardNavigable,
  });

  const tableColumns = useMemo(
    () =>
      isMultiSeries
        ? [xAxisLabel || 'Category', ...effectiveKeys]
        : [xAxisLabel || 'Category', yAxisLabel || 'Value'],
    [isMultiSeries, xAxisLabel, yAxisLabel, effectiveKeys],
  );

  const tableRows = useMemo(
    () =>
      validData.map(d =>
        isMultiSeries ? [getX(d), ...effectiveKeys.map(k => readKey(d, k))] : [getX(d), getY(d)],
      ),
    [validData, isMultiSeries, effectiveKeys, getX, getY],
  );

  if (width < 10 || height < 100) return null;

  // Guards sit below every hook so the hook count never varies between renders.
  if (validData.length === 0 || effectiveKeys.length === 0) {
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
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* Legend (if multi-series) */}
      {(variant === 'stacked' || variant === 'grouped') && (
        <div className="flex flex-wrap gap-4 mb-2">
          {effectiveKeys.map((k, i) => (
            <div key={k} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: palette[i % palette.length] }}
              />
              <span className="text-xs text-muted-foreground font-medium capitalize">{k}</span>
            </div>
          ))}
        </div>
      )}

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
              {showGridRows && <GridRows scale={yScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border))" strokeOpacity={0.5} pointerEvents="none" />}
              {showGridColumns && <GridColumns scale={xScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border, 214.3 31.8% 91.4%))" strokeOpacity={0.5} pointerEvents="none" />}
            </Group>
          )}

          {showXAxis && (
            <AxisBottom
              top={yMax}
              scale={xScale}
              stroke="hsl(var(--border, 214.3 31.8% 91.4%))"
              tickStroke="hsl(var(--border, 214.3 31.8% 91.4%))"
              label={xAxisLabel}
              tickFormat={tickFormat}
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
              tickStroke="hsl(var(--border, 214.3 31.8% 91.4%))"
              label={yAxisLabel}
              labelProps={{
                fill: "hsl(var(--muted-foreground, 215.4 16.3% 46.9%))",
                fontSize: 12,
                textAnchor: 'middle',
                dx: -10
              }}
              tickLabelProps={{
                fill: "hsl(var(--muted-foreground, 215.4 16.3% 46.9%))",
                fontSize: 11,
                textAnchor: "end",
                dx: -4,
                dy: 4,
              }}
              numTicks={5}
            />
          )}

          {/* Stacked Variant */}
          {variant === 'stacked' && (
            <BarStack
              data={validData}
              keys={effectiveKeys}
              x={getX}
              xScale={xScale}
              yScale={yScale}
              color={(k) => palette[effectiveKeys.indexOf(String(k)) % palette.length]}
            >
              {barStacks =>
                barStacks.map(barStack =>
                  barStack.bars.map(bar => (
                    <rect
                      key={`bar-stack-${barStack.index}-${bar.index}`}
                      x={bar.x}
                      y={bar.y}
                      height={bar.height}
                      width={bar.width}
                      fill={bar.color}
                      {...dataPointFocusProps(a11y.focusedIndex === bar.index)}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                      onClick={() => onClick?.(bar.bar.data)}
                      onMouseLeave={() => hideTooltip()}
                      onMouseMove={(event) => {
                        const { x, y } = localPoint(event) || { x: 0, y: 0 };
                        showTooltip({
                          tooltipData: {
                            type: 'stacked',
                            color: bar.color,
                            key: String(bar.key),
                            value: readKey(bar.bar.data, String(bar.key)),
                          },
                          tooltipTop: y,
                          tooltipLeft: x,
                        });
                      }}
                    />
                  ))
                )
              }
            </BarStack>
          )}

          {/* Grouped Variant */}
          {variant === 'grouped' && (
            <BarGroup
              // BarGroup constrains its datum to `object`, which an
              // unconstrained `T` does not satisfy; the row shape is otherwise
              // unchanged.
              data={validData as unknown as Record<string, number>[]}
              keys={effectiveKeys}
              height={yMax}
              x0={getX as unknown as (d: Record<string, number>) => string}
              x0Scale={xScale}
              x1Scale={x1Scale}
              yScale={yScale}
              color={(k) => palette[effectiveKeys.indexOf(String(k)) % palette.length]}
            >
              {barGroups =>
                barGroups.map(barGroup => (
                  <Group key={`bar-group-${barGroup.index}-${barGroup.x0}`} left={barGroup.x0}>
                    {barGroup.bars.map(bar => (
                      <rect
                        key={`bar-group-bar-${barGroup.index}-${bar.index}-${bar.key}`}
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                        fill={bar.color}
                        {...dataPointFocusProps(a11y.focusedIndex === barGroup.index)}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                        onClick={() => onClick?.(validData[barGroup.index])}
                        onMouseLeave={() => hideTooltip()}
                        onMouseMove={(event) => {
                          const { x, y } = localPoint(event) || { x: 0, y: 0 };
                          showTooltip({
                            tooltipData: {
                              type: 'grouped',
                              color: bar.color,
                              key: String(bar.key),
                              value: bar.value,
                            },
                            tooltipTop: y,
                            tooltipLeft: x + barGroup.x0,
                          });
                        }}
                      />
                    ))}
                  </Group>
                ))
              }
            </BarGroup>
          )}

          {/* Simple Variant (Default) */}
          {variant === 'simple' && validData.map((d, dataIndex) => {
            const letter = getX(d);
            const barWidth = xScale.bandwidth();
            const barHeight = yMax - (yScale(getY(d)) ?? 0);
            const barX = xScale(letter);
            const barY = yMax - barHeight;
            const isHex = barColor.startsWith('#') || barColor.startsWith('rgb');
            return (
              <Bar
                key={`bar-${letter}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={isHex ? barColor : undefined}
                {...dataPointFocusProps(a11y.focusedIndex === dataIndex)}
                className={cn("transition-all duration-300 hover:opacity-80 cursor-pointer", !isHex && barColor)}
                onClick={() => onClick?.(d)}
                onMouseLeave={() => hideTooltip()}
                onMouseMove={(event) => {
                  const eventSvgCoords = localPoint(event);
                  const left = barX! + barWidth / 2;
                  showTooltip({
                    tooltipData: { type: 'simple', d },
                    tooltipTop: eventSvgCoords?.y,
                    tooltipLeft: left,
                  });
                }}
              />
            );
          })}
        </Group>
      </svg>
      <ChartA11yLayer a11y={a11y} columns={tableColumns} rows={tableRows} />
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 100 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl">
            {/* Custom Tooltip Logic based on Variant */}
            {tooltipData.type === 'simple' ? (
              <>
                <p className="font-semibold">{String(getY(tooltipData.d))}</p>
                <p className="text-xs text-muted-foreground">{String(getX(tooltipData.d))}</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: tooltipData.color }} />
                  <span className="text-xs font-semibold capitalize">{tooltipData.key}</span>
                </div>
                <p className="text-lg font-bold">{tooltipData.value}</p>
              </>
            )}
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export const BarChart = <T,>(props: BarChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <BarChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
