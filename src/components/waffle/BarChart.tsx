import { useMemo } from 'react';
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
  barColor = "bg-primary"
}: BarChartContentProps<T>) {
  // Config
  const margin = { top: 40, right: 30, bottom: 50, left: 50 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Accessors
  const getX = (d: T) => d[xKey] as string;
  const getY = (d: T) => Number(d[yKey]);

  // Scales
  const xScale = useMemo(
    () =>
      scaleBand<string>({
        range: [0, xMax],
        round: true,
        domain: data.map(getX),
        padding: 0.4,
      }),
    [xMax, data, xKey],
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [yMax, 0],
        round: true,
        domain: [0, Math.max(...data.map(getY))],
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

  if (width < 10 || height < 100) return null;

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
          {data.map((d) => {
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
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <BarChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
