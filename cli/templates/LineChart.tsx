import { useCallback, useMemo } from 'react';
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
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
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
  lineColor = "stroke-primary",
  areaColor = "text-primary", // using text color to set fill via currentColor/opacity
  emptyMessage = 'No data to display',
}: LineChartContentProps<T>) {
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
  const getX = useCallback((d: T) => new Date(d[xKey] as string | number | Date), [xKey]);
  const getY = useCallback((d: T) => Number(d[yKey]), [yKey]);

  // Rows whose xKey does not parse to a real date cannot be positioned.
  const validData = useMemo(
    () => safeData.filter(d => !Number.isNaN(getX(d).getTime())),
    [safeData, getX],
  );

  // Bisector for tooltip
  const bisectDate = useMemo(() => bisector<T, Date>(d => getX(d)).left, [getX]);

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
    const values = validData.map(getY).filter(Number.isFinite);
    const peak = values.length ? Math.max(...values) : 0;
    return scaleLinear<number>({
      range: [yMax, 0],
      round: true,
      domain: [0, peak > 0 ? peak * 1.1 : 100], // Add some padding
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

  const handleTooltip = (event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    const { x } = localPoint(event) || { x: 0 };
    const x0 = xScale.invert(x - margin.left);
    const index = bisectDate(validData, x0, 1);
    const d0 = validData[index - 1];
    const d1 = validData[index];
    let d = d0;
    // d0 is undefined when the pointer sits left of the first point; reading
    // getX(d0) in that case throws.
    if (d0 && d1) {
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
      <svg ref={containerRef} width={width} height={height} className="overflow-visible">
        {/* Defs for gradient */}
        <defs>
          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.2} className={areaColor} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} className={areaColor} />
          </linearGradient>
        </defs>

        <Group left={margin.left} top={margin.top}>
          <GridRows scale={yScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border))" tickValues={[...yScale.ticks(5)]} />
          <GridColumns scale={xScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border))" />

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
            numTicks={width > 520 ? 10 : 5}
          />
          <AxisLeft
            scale={yScale}
            stroke="transparent"
            tickStroke="hsl(var(--border))"
            tickLabelProps={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              textAnchor: "end",
              dx: -4,
              dy: 4,
            }}
            numTicks={5}
          />

          <AreaClosed
            data={validData}
            x={d => xScale(getX(d)) ?? 0}
            y={d => yScale(getY(d)) ?? 0}
            yScale={yScale}
            curve={curveMonotoneX}
            fill="url(#area-gradient)"
            className={areaColor} // Pass helper class to set currentColor if needed
          />

          <LinePath
            data={validData}
            x={d => xScale(getX(d)) ?? 0}
            y={d => yScale(getY(d)) ?? 0}
            curve={curveMonotoneX}
            strokeWidth={2}
            className={cn("fill-transparent transition-all", lineColor)}
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
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent' }}
        >
          <div className="rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
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
    <div className="w-full h-[300px]">
      <ParentSize>
        {({ width, height }) => <LineChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
