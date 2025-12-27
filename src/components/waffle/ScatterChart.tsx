import { useMemo } from 'react';
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
  pointClassName?: string; // Point color/style (Tailwind class)
  pointColor?: string; // Direct color value (hex, rgb, etc.) - takes precedence over pointClassName
  pointRadius?: number; // Point size
  width?: number;
  height?: number;
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

  // Accessors
  const getX = (d: T) => Number(d[xKey]);
  const getY = (d: T) => Number(d[yKey]);

  // Scales
  const xScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [0, xMax],
        round: true,
        domain: [0, Math.max(...data.map(getX)) * 1.1], // Add padding
      }),
    [xMax, data, xKey],
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [yMax, 0],
        round: true,
        domain: [0, Math.max(...data.map(getY)) * 1.1],
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

  if (width < 10) return null;

  return (
    <div className={cn("relative", className)}>
      <svg ref={containerRef} width={width} height={height} className="overflow-visible">
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
          {data.map((d, i) => {
            const cx = xScale(getX(d));
            const cy = yScale(getY(d));
            return (
              <Circle
                key={`point-${i}`}
                cx={cx}
                cy={cy}
                r={pointRadius}
                fill={activeColor}
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

export const ScatterChart = <T,>(props: ScatterChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <ScatterChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
