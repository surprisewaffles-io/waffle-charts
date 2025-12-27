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
import { GlyphCircle } from '@visx/glyph';
import { bisector } from 'd3-array';

// Types
export type LineChartProps<T> = {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  className?: string;
  lineColor?: string;
  areaColor?: string; // CSS class for area fill
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
  margin: customMargin
}: LineChartContentProps<T>) {
  // Config
  const defaultMargin = { top: 40, right: 30, bottom: 50, left: 50 };
  const margin = { ...defaultMargin, ...customMargin };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Accessors
  const getX = (d: T) => new Date(d[xKey] as string | number | Date);
  const getY = (d: T) => Number(d[yKey]);

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
    () =>
      scaleLinear<number>({
        range: [yMax, 0],
        round: true,
        domain: [0, Math.max(...data.map(getY)) * 1.1], // Add some padding
      }),
    [yMax, data, yKey],
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
        tooltipTop: yScale(getY(d)) + margin.top,
      });
    }
  };

  if (width < 10 || height < 100) return null;

  return (
    <div className={cn("relative", className)}>
      <svg ref={containerRef} width={width} height={height} className="overflow-visible">
        {/* Defs for gradient */}
        <defs>
          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor.startsWith('#') ? lineColor : 'currentColor'} stopOpacity={0.2} className={!lineColor.startsWith('#') ? areaColor : undefined} />
            <stop offset="100%" stopColor={lineColor.startsWith('#') ? lineColor : 'currentColor'} stopOpacity={0} className={!lineColor.startsWith('#') ? areaColor : undefined} />
          </linearGradient>
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

          <AreaClosed
            data={data}
            x={d => xScale(getX(d)) ?? 0}
            y={d => yScale(getY(d)) ?? 0}
            yScale={yScale}
            curve={curveMonotoneX}
            fill="url(#area-gradient)"
            className={areaColor} // Pass helper class to set currentColor if needed
          />

          <LinePath
            data={data}
            x={d => xScale(getX(d)) ?? 0}
            y={d => yScale(getY(d)) ?? 0}
            curve={curveMonotoneX}
            strokeWidth={2}
            stroke={lineColor.startsWith('#') ? lineColor : undefined}
            className={cn("fill-transparent transition-all", !lineColor.startsWith('#') && lineColor)}
          />

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

          {/* Tooltip Dot */}
          {tooltipOpen && tooltipData && (
            <g>
              <GlyphCircle
                left={xScale(getX(tooltipData)) ?? 0}
                top={yScale(getY(tooltipData)) ?? 0}
                size={50}
                className={cn("fill-background", lineColor)}
                strokeWidth={2}
                stroke="currentColor" // Inherits from parent or setting explicitly
              />
              <circle
                cx={xScale(getX(tooltipData)) ?? 0}
                cy={yScale(getY(tooltipData)) ?? 0}
                r={4}
                className={cn("fill-background stroke-2", lineColor)}
              />
            </g>
          )}

        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 100 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl">
            <p className="font-semibold">{String(getY(tooltipData))}</p>
            <p className="text-xs text-muted-foreground">{getX(tooltipData).toLocaleDateString()}</p>
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
