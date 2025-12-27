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
export type BubbleChartProps<T> = {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  zKey: keyof T; // Radius
  className?: string; // Wrapper class
  pointClassName?: string; // Point color/style (Tailwind class)
  bubbleColor?: string; // Direct color value (hex, rgb) - takes precedence
  colorScheme?: string[]; // Array of colors for multi-bubble coloring
  width?: number;
  height?: number;
  minRadius?: number;
  maxRadius?: number;
};

// Internal component
type BubbleChartContentProps<T> = BubbleChartProps<T> & {
  width: number;
  height: number;
};

function BubbleChartContent<T>({
  data,
  width,
  height,
  xKey,
  yKey,
  zKey,
  className,
  pointClassName = "fill-primary/50", // Use opacity for bubbles
  bubbleColor = "#a855f7", // Default bubble color
  colorScheme,
  minRadius = 4,
  maxRadius = 30,
}: BubbleChartContentProps<T>) {
  // Config
  const margin = { top: 40, right: 30, bottom: 50, left: 50 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Accessors
  const getX = (d: T) => Number(d[xKey]);
  const getY = (d: T) => Number(d[yKey]);
  const getZ = (d: T) => Number(d[zKey]);

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

  const zScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [minRadius, maxRadius],
        round: true,
        domain: [Math.min(...data.map(getZ)), Math.max(...data.map(getZ))],
      }),
    [minRadius, maxRadius, data, zKey],
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
          {data.map((d, i) => {
            const cx = xScale(getX(d));
            const cy = yScale(getY(d));
            const r = zScale(getZ(d));
            // Determine fill color: colorScheme (per bubble) > bubbleColor (single) > pointClassName
            const fillColor = colorScheme ? colorScheme[i % colorScheme.length] : bubbleColor;

            return (
              <Circle
                key={`point-${i}`}
                cx={cx}
                cy={cy}
                r={r}
                fill={fillColor}
                className={cn("transition-all duration-300 hover:opacity-80 cursor-pointer stroke-background stroke-1", !fillColor && pointClassName)}
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
              <span className="font-semibold text-xs text-muted-foreground">Values</span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1">
                <span>X:</span>
                <span className="font-mono">{String(getX(tooltipData))}</span>
                <span>Y:</span>
                <span className="font-mono">{String(getY(tooltipData))}</span>
                <span>Z:</span>
                <span className="font-mono">{String(getZ(tooltipData))}</span>
              </div>
            </div>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export const BubbleChart = <T,>(props: BubbleChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <BubbleChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
