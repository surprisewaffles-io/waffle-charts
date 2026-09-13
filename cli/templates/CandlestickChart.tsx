import { useCallback, useMemo } from 'react';
import { Group } from '@visx/group';
import { scaleTime, scaleLinear } from '@visx/scale';
import { Bar, Line } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { ParentSize } from '@visx/responsive';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { extent } from 'd3-array';
import { cn } from '../../lib/utils';

export type CandlestickChartProps<T> = {
  data: T[];
  xKey: keyof T;
  openKey: keyof T;
  highKey: keyof T;
  lowKey: keyof T;
  closeKey: keyof T;
  className?: string;
  upColor?: string;
  downColor?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGrid?: boolean;
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
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
  xAxisLabel,
  yAxisLabel,
  showXAxis = true,
  showYAxis = true,
  showGrid = true,
  emptyMessage = 'No data to display',
}: CandlestickChartProps<T> & { width: number; height: number }) {
  const margin = { top: 20, right: 30, bottom: 50, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Every hook below runs unconditionally. `data` is normalised to an array
  // here rather than guarded with an early return, because an early return
  // placed above these hooks changes the hook count between renders.
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Accessors are memoised so the scale memos below actually cache — a fresh
  // closure each render would invalidate them on every pass.
  const getX = useCallback((d: T) => new Date(d[xKey] as string | number | Date), [xKey]);
  const getOpen = useCallback((d: T) => Number(d[openKey]), [openKey]);
  const getHigh = useCallback((d: T) => Number(d[highKey]), [highKey]);
  const getLow = useCallback((d: T) => Number(d[lowKey]), [lowKey]);
  const getClose = useCallback((d: T) => Number(d[closeKey]), [closeKey]);

  // A candle needs a real date and a finite high and low to be drawn.
  const validData = useMemo(
    () =>
      safeData.filter(
        d =>
          !Number.isNaN(getX(d).getTime()) &&
          Number.isFinite(getHigh(d)) &&
          Number.isFinite(getLow(d)),
      ),
    [safeData, getX, getHigh, getLow],
  );

  // Scales
  const xScale = useMemo(
    () =>
      scaleTime({
        range: [0, innerWidth],
        // extent returns [undefined, undefined] for an empty input, which
        // yields an unusable domain.
        domain: (extent(validData, getX) as [Date, Date]) ?? [new Date(), new Date()],
      }),
    [innerWidth, validData, getX]
  );

  const yScale = useMemo(() => {
    // Math.min/max spread over an empty array yield Infinity/-Infinity, which
    // are truthy — a `|| 0` fallback never fires and the domain is inverted.
    const lows = validData.map(getLow);
    const highs = validData.map(getHigh);
    const domain: [number, number] = lows.length
      ? [Math.min(...lows), Math.max(...highs)]
      : [0, 100];
    return scaleLinear({
      range: [innerHeight, 0],
      domain,
      nice: true,
    });
  }, [innerHeight, validData, getHigh, getLow]);

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

  // Calculate candle width dynamically based on data length
  // Use 80% of the available space per data point, capped at a max width.
  // Dividing by an empty length would make every candle Infinity wide.
  const candleWidth = Math.min((innerWidth / validData.length) * 0.8, 20);

  return (
    <div className={cn("relative", className)}>
      <svg ref={containerRef} width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {showGrid && (
            <>
              <GridRows
                scale={yScale}
                width={innerWidth}
                strokeDasharray="3,3"
                stroke="hsl(var(--border, 214.3 31.8% 91.4%))"
                strokeOpacity={0.5}
              />
              <GridColumns
                scale={xScale}
                height={innerHeight}
                strokeDasharray="3,3"
                stroke="hsl(var(--border, 214.3 31.8% 91.4%))"
                strokeOpacity={0.5}
              />
            </>
          )}

          {validData.map((d, i) => {
            const open = getOpen(d);
            const close = getClose(d);
            const high = getHigh(d);
            const low = getLow(d);
            const x = xScale(getX(d));
            const isUp = close > open;
            const color = isUp ? upColor : downColor;
            const barHeight = Math.abs(yScale(open) - yScale(close));
            const barY = yScale(Math.max(open, close));

            return (
              <Group key={i} left={x}>
                {/* Wick */}
                <Line
                  from={{ x: 0, y: yScale(low) }}
                  to={{ x: 0, y: yScale(high) }}
                  stroke={color}
                  strokeWidth={1.5}
                />
                {/* Body */}
                <Bar
                  x={-candleWidth / 2}
                  y={barY}
                  width={candleWidth}
                  height={Math.max(barHeight, 1)} // Ensure at least 1px height
                  fill={color}
                  className="cursor-pointer"
                  onFocus={() => { }}
                  onMouseOver={() => showTooltip({
                    tooltipData: d,
                    tooltipLeft: xScale(getX(d)) + margin.left,
                    tooltipTop: barY + margin.top
                  })}
                  onMouseOut={hideTooltip}
                />
              </Group>
            );
          })}

          {showXAxis && (
            <AxisBottom
              top={innerHeight}
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
              stroke="hsl(var(--border, 214.3 31.8% 91.4%))"
              tickStroke="hsl(var(--border, 214.3 31.8% 91.4%))"
              label={yAxisLabel}
              labelProps={{
                fill: "hsl(var(--muted-foreground, 215.4 16.3% 46.9%))",
                fontSize: 12,
                textAnchor: 'middle',
                dx: -10
              }}
              tickLabelProps={{
                fill: "hsl(var(--muted-foreground, 215.4 16.3% 46.9%))",
                fontSize: 11,
                textAnchor: "end",
                dx: -4,
                dy: 4 // Center vertically
              }}
            />
          )}
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            backgroundColor: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            padding: "0.5rem",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            zIndex: 50,
          }}
        >
          <div className="text-xs font-semibold mb-1">
            {getX(tooltipData).toLocaleDateString()}
          </div>
          <div className="grid grid-cols-2 gap-x-3 text-xs">
            <span className="text-muted-foreground">Open:</span>
            <span className="font-mono">{getOpen(tooltipData).toFixed(2)}</span>
            <span className="text-muted-foreground">High:</span>
            <span className="font-mono">{getHigh(tooltipData).toFixed(2)}</span>
            <span className="text-muted-foreground">Low:</span>
            <span className="font-mono">{getLow(tooltipData).toFixed(2)}</span>
            <span className="text-muted-foreground">Close:</span>
            <span className="font-mono">{getClose(tooltipData).toFixed(2)}</span>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export function CandlestickChart<T>(props: CandlestickChartProps<T>) {
  return (
    <ParentSize>
      {({ width, height }) => <CandlestickChartContent {...props} width={width} height={height} />}
    </ParentSize>
  );
}
