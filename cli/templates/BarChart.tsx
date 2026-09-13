import { useCallback, useMemo } from 'react';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';

// Types
export type BarChartProps<T> = {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  className?: string;
  barColor?: string;
  width?: number;
  height?: number;
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
};

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
  className,
  barColor = "bg-primary",
  emptyMessage = 'No data to display',
}: BarChartContentProps<T>) {
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
  const getX = useCallback((d: T) => d[xKey] as string, [xKey]);
  const getY = useCallback((d: T) => Number(d[yKey]), [yKey]);

  // Rows without a finite value have no bar height.
  const validData = useMemo(
    () => safeData.filter(d => Number.isFinite(getY(d))),
    [safeData, getY],
  );

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

  const yScale = useMemo(() => {
    // Math.max spread over an empty array yields -Infinity, which is truthy —
    // a `|| 0` fallback never fires and the domain becomes unusable.
    const peak = validData.length ? Math.max(...validData.map(getY)) : 0;
    return scaleLinear<number>({
      range: [yMax, 0],
      round: true,
      domain: [0, peak > 0 ? peak : 100],
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
            numTicks={5}
          />
          {validData.map((d) => {
            const letter = getX(d);
            const barWidth = xScale.bandwidth();
            const barHeight = yMax - (yScale(getY(d)) ?? 0);
            const barX = xScale(letter);
            const barY = yMax - barHeight;
            return (
              <Bar
                key={`bar-${letter}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                className={cn("fill-primary transition-all duration-300 hover:opacity-80 cursor-pointer", barColor)}
                onMouseLeave={() => hideTooltip()}
                onMouseMove={(event) => {
                  const eventSvgCoords = localPoint(event);
                  const left = barX! + barWidth / 2;
                  showTooltip({
                    tooltipData: d,
                    tooltipTop: eventSvgCoords?.y,
                    tooltipLeft: left,
                  });
                }}
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
            <p className="font-semibold">{String(getY(tooltipData))}</p>
            <p className="text-xs text-muted-foreground">{getX(tooltipData)}</p>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export const BarChart = <T,>(props: BarChartProps<T>) => {
  return (
    <div className="w-full h-[300px]">
      <ParentSize>
        {({ width, height }) => <BarChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
