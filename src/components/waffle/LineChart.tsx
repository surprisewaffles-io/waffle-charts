import { useMemo } from 'react';
import { AreaClosed, LinePath, Bar } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { Group } from '@visx/group';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { bisector } from 'd3-array';

// Types
export type LineChartProps<T> = {
  data: T[];
  xKey: keyof T;
  yKey?: keyof T; // Optional if series is provided
  className?: string;
  lineColor?: string;
  areaColor?: string; // CSS class for area fill (single series)
  width?: number;
  height?: number;

  // Multi-Series Configuration
  series?: {
    key: keyof T;
    color?: string;
    label?: string;
    areaColor?: string; // Optional per series
  }[];

  // Configuration
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGridRows?: boolean;
  showGridColumns?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
  yDomain?: [number, number];
};

type LineChartContentProps<T> = LineChartProps<T> & {
  width: number;
  height: number;
};

function LineChartContent<T>({
  data,
  width,
  height,
  xKey,
  yKey,
  className,
  lineColor = "#a855f7",
  areaColor = "#ec4899",
  showXAxis = true,
  showYAxis = true,
  showGridRows = true,
  showGridColumns = false,
  xAxisLabel,
  yAxisLabel,
  margin: customMargin,
  yDomain,
  series
}: LineChartContentProps<T>) {
  // Config
  const defaultMargin = { top: 40, right: 30, bottom: 50, left: 50 };
  const margin = { ...defaultMargin, ...customMargin };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;


  // Backward compatibility: Convert legacy single-series props to series array
  // If 'series' is provided, use it. Otherwise use 'yKey'.
  const effectiveSeries = series || (yKey ? [{
    key: yKey,
    color: lineColor || "#a855f7",
    label: yAxisLabel || String(yKey),
    areaColor: areaColor // Only single series supported area before
  }] : []);

  // Accessors
  const getX = (d: T) => new Date(d[xKey] as string | number | Date);
  // Helper to get value for a specific key
  const getValue = (d: T, key: keyof T) => Number(d[key]);

  // Bisector for tooltip
  const bisectDate = bisector<T, Date>(d => getX(d)).left;

  // Scales
  const xScale = useMemo(
    () =>
      scaleTime({
        range: [0, xMax],
        domain: [Math.min(...data.map(d => getX(d).getTime())), Math.max(...data.map(d => getX(d).getTime()))],
      }),
    [xMax, data, xKey],
  );

  const yScale = useMemo(
    () => {
      // Find global max across all series
      const allValues = data.flatMap(d => effectiveSeries.map(s => getValue(d, s.key)));
      const maxY = Math.max(...allValues);

      return scaleLinear<number>({
        range: [yMax, 0],
        round: true,
        domain: yDomain || [0, maxY * 1.1],
      });
    },
    [yMax, data, effectiveSeries, yDomain],
  );

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

  const handleTooltip = (event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    const { x } = localPoint(event) || { x: 0 };
    const x0 = xScale.invert(x - margin.left);
    const index = bisectDate(data, x0, 1);
    const d0 = data[index - 1];
    const d1 = data[index];
    let d = d0;
    if (d1 && getX(d1)) {
      d = x0.valueOf() - getX(d0).valueOf() > getX(d1).valueOf() - x0.valueOf() ? d1 : d0;
    }

    if (d) {
      showTooltip({
        tooltipData: d,
        tooltipLeft: xScale(getX(d)) + margin.left,
        tooltipTop: yScale(Math.max(...effectiveSeries.map(s => getValue(d, s.key)))) + margin.top, // Heuristic: top of the highest point? Or follow mouse Y?
        // Better: Find the Y of the closest series, or just render tooltip at the top/mouse position.
        // For now, let's keep it simple: Tooltip is "Master" tooltip showing all values.
      });
    }
  };

  if (width < 10 || height < 100) return null;

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* Legend (if multi-series) */}
      {effectiveSeries.length > 1 && (
        <div className="flex flex-wrap gap-4 mb-2">
          {effectiveSeries.map((s) => (
            <div key={String(s.key)} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: s.color?.startsWith('#') ? s.color : undefined }}
              />
              <span className="text-xs text-muted-foreground font-medium">{s.label || String(s.key)}</span>
            </div>
          ))}
        </div>
      )}

      <svg ref={containerRef} width={width} height={height} className="overflow-visible">
        {/* Defs for gradients */}
        <defs>
          {effectiveSeries.map((s, i) => (
            <linearGradient key={`grad-${i}`} id={`area-gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color?.startsWith('#') ? s.color : 'currentColor'} stopOpacity={0.2} />
              <stop offset="100%" stopColor={s.color?.startsWith('#') ? s.color : 'currentColor'} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        <Group left={margin.left} top={margin.top}>
          {(showGridRows || showGridColumns) && (
            <Group>
              {showGridRows && <GridRows scale={yScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border, 214.3 31.8% 91.4%))" tickValues={[...yScale.ticks(5)]} />}
              {showGridColumns && <GridColumns scale={xScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border, 214.3 31.8% 91.4%))" />}
            </Group>
          )}

          {showXAxis && (
            <AxisBottom
              top={yMax}
              scale={xScale}
              stroke="hsl(var(--border))"
              tickStroke="hsl(var(--border))"
              label={xAxisLabel}
              labelProps={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: 12,
                textAnchor: 'middle',
                dy: 0
              }}
              tickLabelProps={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: 11,
                textAnchor: "middle",
              }}
              numTicks={width > 520 ? 10 : 5}
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
              numTicks={5}
            />
          )}

          {/* Render Series Loops */}
          {effectiveSeries.map((s, i) => (
            <Group key={String(s.key)}>
              {/* Only render Area for the first series if it was requested via legacy prop, 
                   OR if we decide to support stacked areas later. 
                   For now, 'areaColor' is legacy. Let's support it for single series. */}
              {effectiveSeries.length === 1 && s.areaColor && (
                <AreaClosed
                  data={data}
                  x={d => xScale(getX(d)) ?? 0}
                  y={d => yScale(getValue(d, s.key)) ?? 0}
                  yScale={yScale}
                  curve={curveMonotoneX}
                  fill={`url(#area-gradient-${i})`}
                  className={s.areaColor}
                />
              )}

              <LinePath
                data={data}
                x={d => xScale(getX(d)) ?? 0}
                y={d => yScale(getValue(d, s.key)) ?? 0}
                curve={curveMonotoneX}
                strokeWidth={2}
                stroke={s.color?.startsWith('#') ? s.color : undefined}
                className={cn("fill-transparent transition-all", !s.color?.startsWith('#') && s.color)}
              />
            </Group>
          ))}


          {/* Tooltip Overlay */}
          <Bar
            x={0}
            y={0}
            width={xMax}
            height={yMax}
            fill="transparent"
            rx={14}
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={() => hideTooltip()}
          />

          {/* Tooltip Dots (One per series) */}
          {tooltipOpen && tooltipData && effectiveSeries.map((s) => (
            <g key={`dot-${String(s.key)}`}>
              <circle
                cx={xScale(getX(tooltipData)) ?? 0}
                cy={yScale(getValue(tooltipData, s.key)) ?? 0}
                r={4}
                fill={s.color?.startsWith('#') ? s.color : 'currentColor'}
                stroke="white"
                strokeWidth={2}
                className="shadow-sm"
              />
            </g>
          ))}

        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 100 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl">
            <div className="text-xs text-muted-foreground mb-1 font-semibold">{getX(tooltipData).toLocaleDateString()}</div>
            {effectiveSeries.map(s => (
              <div key={String(s.key)} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color?.startsWith('#') ? s.color : 'currentColor' }} />
                <span className="text-xs opacity-70">{s.label || String(s.key)}:</span>
                <span className="font-semibold">{String(getValue(tooltipData, s.key))}</span>
              </div>
            ))}
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export const LineChart = <T,>(props: LineChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <LineChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
