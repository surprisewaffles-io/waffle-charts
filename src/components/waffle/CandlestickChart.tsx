import { useMemo } from 'react';
import { Bar, Line } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { min, max } from 'd3-array';

export type CandlestickData = {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type CandlestickChartProps<T> = {
  data: T[];
  xKey: keyof T;
  openKey: keyof T;
  highKey: keyof T;
  lowKey: keyof T;
  closeKey: keyof T;

  width?: number;
  height?: number;
  className?: string;

  // Colors
  upColor?: string; // Default green
  downColor?: string; // Default red

  // Configuration
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGridRows?: boolean;
  showGridColumns?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
};

type CandlestickChartContentProps<T> = CandlestickChartProps<T> & {
  width: number;
  height: number;
};

function CandlestickChartContent<T>({
  data,
  width,
  height,
  xKey,
  openKey,
  highKey,
  lowKey,
  closeKey,
  className,
  upColor = "#22c55e", // green-500
  downColor = "#ef4444", // red-500
  showXAxis = true,
  showYAxis = true,
  showGridRows = true,
  showGridColumns = false,
  xAxisLabel,
  yAxisLabel,
  margin: customMargin,
}: CandlestickChartContentProps<T>) {
  // Config
  const defaultMargin = { top: 40, right: 30, bottom: 50, left: 50 };
  const margin = { ...defaultMargin, ...customMargin };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Accessors
  const getX = (d: T) => new Date(d[xKey] as string | number | Date);
  const getHigh = (d: T) => Number(d[highKey]);
  const getLow = (d: T) => Number(d[lowKey]);
  const getOpen = (d: T) => Number(d[openKey]);
  const getClose = (d: T) => Number(d[closeKey]);

  // Scales
  const xScale = useMemo(
    () =>
      scaleTime({
        range: [0, xMax],
        domain: [
          min(data, getX) || new Date(),
          max(data, getX) || new Date()
        ],
      }),
    [xMax, data, xKey],
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [yMax, 0],
        round: true,
        domain: [
          (min(data, getLow) || 0) * 0.95, // Add some padding
          (max(data, getHigh) || 0) * 1.05
        ],
        nice: true,
      }),
    [yMax, data, highKey, lowKey],
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

  // Calculate candle width dynamically based on data density
  const candleWidth = Math.max(1, (xMax / data.length) * 0.7);

  return (
    <div className={cn("relative", className)}>
      <svg ref={containerRef} width={width} height={height} className="overflow-visible">
        <Group left={margin.left} top={margin.top}>
          {(showGridRows || showGridColumns) && (
            <Group>
              {showGridRows && <GridRows scale={yScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border, 214.3 31.8% 91.4%))" />}
              {showGridColumns && <GridColumns scale={xScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border, 214.3 31.8% 91.4%))" />}
            </Group>
          )}

          {showXAxis && (
            <AxisBottom
              top={yMax}
              scale={xScale}
              stroke="hsl(var(--border, 214.3 31.8% 91.4%))"
              tickStroke="hsl(var(--border, 214.3 31.8% 91.4%))"
              label={xAxisLabel}
              numTicks={width > 500 ? 10 : 5}
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
            />
          )}

          {data.map((d, i) => {
            const x = xScale(getX(d));
            const open = getOpen(d);
            const close = getClose(d);
            const high = getHigh(d);
            const low = getLow(d);
            const isUp = close > open;
            const color = isUp ? upColor : downColor;

            const barY = yScale(Math.max(open, close));
            const barHeight = Math.abs(yScale(open) - yScale(close));

            return (
              <Group key={`candle-${i}`}>
                {/* Wick */}
                <Line
                  from={{ x: x, y: yScale(high) }}
                  to={{ x: x, y: yScale(low) }}
                  stroke={color}
                  strokeWidth={1}
                />
                {/* Body */}
                <Bar
                  x={x - candleWidth / 2}
                  y={barY}
                  width={candleWidth}
                  height={Math.max(1, barHeight)} // Ensure at least 1px height
                  fill={color}
                  className="hover:opacity-80 cursor-pointer"
                  onMouseLeave={() => hideTooltip()}
                  onMouseMove={(event) => {
                    const { x: tX, y: tY } = localPoint(event) || { x: 0, y: 0 };
                    showTooltip({
                      tooltipData: d,
                      tooltipTop: tY,
                      tooltipLeft: tX,
                    });
                  }}
                />
              </Group>
            );
          })}
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 50 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl">
            <p className="font-semibold text-xs text-muted-foreground mb-1">
              {getX(tooltipData).toLocaleDateString()}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Open</span>
              <span className="font-mono font-medium text-right">{getOpen(tooltipData).toFixed(2)}</span>

              <span className="text-muted-foreground">High</span>
              <span className="font-mono font-medium text-right text-green-600">{getHigh(tooltipData).toFixed(2)}</span>

              <span className="text-muted-foreground">Low</span>
              <span className="font-mono font-medium text-right text-red-600">{getLow(tooltipData).toFixed(2)}</span>

              <span className="text-muted-foreground">Close</span>
              <span className="font-mono font-bold text-right">{getClose(tooltipData).toFixed(2)}</span>
            </div>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export const CandlestickChart = <T,>(props: CandlestickChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <CandlestickChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
