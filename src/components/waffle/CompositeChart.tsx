import { Group } from '@visx/group';
import { Bar, LinePath } from '@visx/shape';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisLeft, AxisRight, AxisBottom } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { ParentSize } from '@visx/responsive';
import { curveMonotoneX } from '@visx/curve';
import { localPoint } from '@visx/event';
import { cn } from '../../lib/utils';
import { ChartA11yLayer, ChartSvgDescription } from './ChartA11y';
import {
  dataPointFocusProps,
  useChartA11y,
  type ChartA11yProps,
} from '../../lib/chart-a11y';
import React, { useCallback, useMemo } from 'react';

// Types
export type CompositeChartProps<T> = ChartA11yProps & {
  data: T[];
  xKey: keyof T;
  barKey: keyof T;
  lineKey: keyof T;
  width?: number;
  height?: number;
  className?: string;
  barColor?: string;
  lineColor?: string;
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
};

type CompositeChartContentProps<T> = CompositeChartProps<T> & {
  width: number;
  height: number;
};

function CompositeChartContent<T>({
  data,
  xKey,
  barKey,
  lineKey,
  width,
  height,
  className,
  barColor = '#3b82f6', // blue-500
  lineColor = '#ef4444', // red-500
  emptyMessage = 'No data to display',
  ariaLabel,
  ariaDescribedby,
  title,
  description,
  keyboardNavigable,
}: CompositeChartContentProps<T>) {
  // Adaptive margins that scale down for small containers
  const baseMargin = { top: 40, right: 50, bottom: 50, left: 50 };
  const margin = {
    top: Math.min(baseMargin.top, height * 0.15),
    right: Math.min(baseMargin.right, width * 0.1),
    bottom: Math.min(baseMargin.bottom, height * 0.2),
    left: Math.min(baseMargin.left, width * 0.1),
  };

  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  // The container-size guard used to sit here, above every hook, so a shrinking
  // container changed the hook count between renders. It now lives below them.

  // `data` is normalised to an array here rather than guarded with an early
  // return, for the same reason.
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Accessors are memoised so the scale memos below actually cache — a fresh
  // closure each render would invalidate them on every pass.
  const getX = useCallback((d: T) => d[xKey] as unknown as string, [xKey]);
  const getBarValue = useCallback((d: T) => Number(d[barKey]), [barKey]);
  const getLineValue = useCallback((d: T) => Number(d[lineKey]), [lineKey]);

  // A row needs both a bar height and a line height to be drawn.
  const validData = useMemo(
    () =>
      safeData.filter(
        d => Number.isFinite(getBarValue(d)) && Number.isFinite(getLineValue(d)),
      ),
    [safeData, getBarValue, getLineValue],
  );

  // Scales
  const xScale = useMemo(
    () =>
      scaleBand({
        range: [0, innerWidth],
        domain: validData.map(getX),
        padding: 0.4,
      }),
    [innerWidth, validData, getX]
  );

  // Math.max spread over an empty array yields -Infinity, which is truthy — a
  // `|| 0` fallback never fires and the domain becomes unusable.
  const y1Scale = useMemo(() => {
    const peak = validData.length ? Math.max(...validData.map(getBarValue)) : 0;
    return scaleLinear({
      range: [innerHeight, 0],
      domain: [0, peak > 0 ? peak * 1.1 : 100], // 10% headroom
    });
  }, [innerHeight, validData, getBarValue]);

  const y2Scale = useMemo(() => {
    const peak = validData.length ? Math.max(...validData.map(getLineValue)) : 0;
    return scaleLinear({
      range: [innerHeight, 0],
      domain: [0, peak > 0 ? peak * 1.1 : 100],
    });
  }, [innerHeight, validData, getLineValue]);

  // Tooltip
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<{ x: string; barVal: number; lineVal: number }>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  // Two series on two axes: the summary covers the bars, and each announcement
  // reads both numbers, since the point of the chart is comparing them.
  const a11yValues = useMemo(() => validData.map(getBarValue), [validData, getBarValue]);

  const a11y = useChartA11y({
    chartType: 'Combination bar and line chart',
    itemCount: validData.length,
    itemNoun: 'category',
    values: a11yValues,
    detail: `Bars show ${String(barKey)}; the line shows ${String(lineKey)} on a second axis.`,
    describeItem: index => {
      const d = validData[index];
      return d
        ? `${getX(d)}. ${String(barKey)}: ${getBarValue(d)}, ${String(lineKey)}: ${getLineValue(d)}`
        : '';
    },
    ariaLabel,
    ariaDescribedby,
    title,
    description,
    keyboardNavigable,
  });

  const tableRows = useMemo(
    () => validData.map(d => [getX(d), getBarValue(d), getLineValue(d)]),
    [validData, getX, getBarValue, getLineValue],
  );

  const handleTooltip = (event: React.MouseEvent | React.TouchEvent) => {
    const { x } = localPoint(event) || { x: 0 };
    const x0 = x - margin.left;
    const bandWidth = xScale.step();
    const index = Math.floor(x0 / bandWidth);

    if (index >= 0 && index < validData.length) {
      const d = validData[index];
      const barVal = getBarValue(d);
      const lineVal = getLineValue(d);
      const xVal = getX(d);

      const barX = xScale(xVal) ?? 0;

      showTooltip({
        tooltipData: { x: xVal, barVal, lineVal },
        tooltipLeft: barX + xScale.bandwidth() / 2 + margin.left,
        tooltipTop: y1Scale(barVal) + margin.top, // Snap to bar top or mouse Y
      });
    }
  };

  // Guards sit below every hook so the hook count never varies between renders.
  if (width < 50) return null;
  // Skip rendering if container is too small
  if (innerWidth < 50 || innerHeight < 50) return null;

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
    <div className={cn("relative font-sans", className)}>
      <svg
        {...a11y.svgProps}
        ref={containerRef}
        width={width}
        height={height}
        className={cn('overflow-visible', a11y.svgProps.className)}
        onMouseMove={handleTooltip}
        onMouseLeave={() => hideTooltip()}
        onTouchMove={handleTooltip}
      >
        <ChartSvgDescription
          titleId={a11y.titleId}
          descId={a11y.descId}
          title={a11y.resolvedTitle}
          description={a11y.resolvedDescription}
        />
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={y1Scale} width={innerWidth} strokeDasharray="3,3" strokeOpacity={0.2} />

          {/* Bars (Primary Axis) */}
          {validData.map((d, i) => {
            const xVal = getX(d);
            const barWidth = xScale.bandwidth();
            const barHeight = innerHeight - (y1Scale(getBarValue(d)) ?? 0);
            const barX = xScale(xVal);
            const barY = innerHeight - barHeight;
            return (
              <Bar
                key={`bar-${xVal}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={barColor}
                rx={4}
                opacity={0.8}
                {...dataPointFocusProps(a11y.focusedIndex === i)}
              />
            );
          })}

          {/* Line (Secondary Axis) */}
          <LinePath
            data={validData}
            x={(d) => (xScale(getX(d)) ?? 0) + xScale.bandwidth() / 2}
            y={(d) => y2Scale(getLineValue(d)) ?? 0}
            stroke={lineColor}
            strokeWidth={3}
            curve={curveMonotoneX}
          />
          {/* Line Points */}
          {validData.map((d, i) => (
            <circle
              key={i}
              cx={(xScale(getX(d)) ?? 0) + xScale.bandwidth() / 2}
              cy={y2Scale(getLineValue(d)) ?? 0}
              r={a11y.focusedIndex === i ? 6 : 4}
              fill={lineColor}
              stroke="white"
              strokeWidth={2}
              {...dataPointFocusProps(a11y.focusedIndex === i)}
            />
          ))}

          {/* Axes */}
          <AxisBottom
            scale={xScale}
            top={innerHeight}
            stroke="hsl(var(--muted-foreground, 215.4 16.3% 46.9%))"
            tickStroke="hsl(var(--muted-foreground, 215.4 16.3% 46.9%))"
            tickLabelProps={{
              fill: "hsl(var(--muted-foreground, 215.4 16.3% 46.9%))",
              fontSize: 11,
              textAnchor: 'middle',
            }}
          />
          <AxisLeft
            scale={y1Scale}
            stroke="hsl(var(--muted-foreground, 215.4 16.3% 46.9%))"
            tickStroke="hsl(var(--muted-foreground, 215.4 16.3% 46.9%))"
            tickLabelProps={{
              fill: barColor, // Color match axis to data
              fontSize: 11,
              textAnchor: 'end',
              dx: -4,
              dy: 2,
            }}
          />
          <AxisRight
            scale={y2Scale}
            left={innerWidth}
            stroke="hsl(var(--muted-foreground, 215.4 16.3% 46.9%))"
            tickStroke="hsl(var(--muted-foreground, 215.4 16.3% 46.9%))"
            tickLabelProps={{
              fill: lineColor, // Color match axis to data
              fontSize: 11,
              textAnchor: 'start',
              dx: 4,
              dy: 2,
            }}
          />
        </Group>
      </svg>

      <ChartA11yLayer
        a11y={a11y}
        columns={[String(xKey), String(barKey), String(lineKey)]}
        rows={tableRows}
      />

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 100 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl">
            <span className="font-semibold block mb-1">{tooltipData.x}</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ background: barColor }}></span>
              <span>Bar: {tooltipData.barVal}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ background: lineColor }}></span>
              <span>Line: {tooltipData.lineVal}</span>
            </div>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export function CompositeChart<T>(props: CompositeChartProps<T>) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <CompositeChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  );
}
