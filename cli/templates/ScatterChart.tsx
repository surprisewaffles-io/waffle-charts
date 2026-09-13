import { useCallback, useMemo } from 'react';
import { Group } from '@visx/group';
import { Circle } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Grid } from '@visx/grid';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';

// Types
export type ScatterChartProps<T> = {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  className?: string; // Wrapper class
  pointClassName?: string; // Point color/style
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
  pointClassName = "fill-primary",
  emptyMessage = 'No data to display',
}: ScatterChartContentProps<T>) {
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
        <Group left={margin.left} top={margin.top}>
          <Grid
            xScale={xScale}
            yScale={yScale}
            width={xMax}
            height={yMax}
            stroke="hsl(var(--border))"
            strokeOpacity={0.4}
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
          />
          {validData.map((d, i) => {
            const cx = xScale(getX(d));
            const cy = yScale(getY(d));
            return (
              <Circle
                key={`point-${i}`}
                cx={cx}
                cy={cy}
                r={6}
                className={cn("transition-all duration-300 hover:r-8 hover:opacity-80 cursor-pointer", pointClassName)}
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
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent' }}
        >
          <div className="rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
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

export const ScatterChart = <T,>(props: ScatterChartProps<T>) => {
  return (
    <div className="w-full h-[300px]">
      <ParentSize>
        {({ width, height }) => <ScatterChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
