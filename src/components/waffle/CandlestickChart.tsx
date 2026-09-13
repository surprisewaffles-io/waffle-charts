import { useCallback, useMemo } from 'react';
import { Bar, Line } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { ChartA11yLayer, ChartSvgDescription } from './ChartA11y';
import {
  dataPointFocusProps,
  useChartA11y,
  type ChartA11yProps,
} from '../../lib/chart-a11y';
import { min, max } from 'd3-array';

export type CandlestickData = {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type CandlestickChartProps<T> = ChartA11yProps & {
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
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
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
  emptyMessage = 'No data to display',
  ariaLabel,
  ariaDescribedby,
  title,
  description,
  keyboardNavigable,
}: CandlestickChartContentProps<T>) {
  // Config
  const defaultMargin = { top: 40, right: 30, bottom: 50, left: 50 };
  const margin = { ...defaultMargin, ...customMargin };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Every hook below runs unconditionally. `data` is normalised to an array
  // here rather than guarded with an early return, because an early return
  // placed above these hooks changes the hook count between renders.
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Accessors are memoised so the scale memos below actually cache — a fresh
  // closure each render would invalidate them on every pass.
  const getX = useCallback((d: T) => new Date(d[xKey] as string | number | Date), [xKey]);
  const getHigh = useCallback((d: T) => Number(d[highKey]), [highKey]);
  const getLow = useCallback((d: T) => Number(d[lowKey]), [lowKey]);
  const getOpen = useCallback((d: T) => Number(d[openKey]), [openKey]);
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
        range: [0, xMax],
        domain: [
          min(validData, getX) || new Date(),
          max(validData, getX) || new Date()
        ],
      }),
    [xMax, validData, getX],
  );

  const yScale = useMemo(() => {
    // d3's min/max return undefined for an empty input, so an all-zero domain
    // would collapse the axis; the fallback gives it a usable span instead.
    const low = min(validData, getLow);
    const high = max(validData, getHigh);
    const domain: [number, number] =
      low === undefined || high === undefined ? [0, 100] : [low * 0.95, high * 1.05];
    return scaleLinear<number>({
      range: [yMax, 0],
      round: true,
      domain,
      nice: true,
    });
  }, [yMax, validData, getLow, getHigh]);

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

  // The close is the figure a reader tracks across sessions, so it drives the
  // range summary; the announcement still reads all four prices plus direction,
  // because colour alone carries direction on screen.
  const a11yValues = useMemo(() => validData.map(getClose), [validData, getClose]);

  const a11y = useChartA11y({
    chartType: 'Candlestick chart',
    itemCount: validData.length,
    itemNoun: 'session',
    values: a11yValues,
    describeItem: index => {
      const d = validData[index];
      if (!d) return '';
      const direction = getClose(d) > getOpen(d) ? 'up' : 'down';
      return `${getX(d).toLocaleDateString()}, ${direction}. Open ${getOpen(d)}, high ${getHigh(d)}, low ${getLow(d)}, close ${getClose(d)}`;
    },
    ariaLabel,
    ariaDescribedby,
    title,
    description,
    keyboardNavigable,
  });

  const tableRows = useMemo(
    () =>
      validData.map(d => [
        getX(d).toLocaleDateString(),
        getOpen(d),
        getHigh(d),
        getLow(d),
        getClose(d),
      ]),
    [validData, getX, getOpen, getHigh, getLow, getClose],
  );

  if (width < 10 || height < 100) return null;

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

  // Calculate candle width dynamically based on data density. Dividing by an
  // empty length would make every candle Infinity wide.
  const candleWidth = Math.max(1, (xMax / validData.length) * 0.7);

  return (
    <div className={cn("relative", className)}>
      <svg
        {...a11y.svgProps}
        ref={containerRef}
        width={width}
        height={height}
        className={cn('overflow-visible', a11y.svgProps.className)}
      >
        <ChartSvgDescription
          titleId={a11y.titleId}
          descId={a11y.descId}
          title={a11y.resolvedTitle}
          description={a11y.resolvedDescription}
        />
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

          {validData.map((d, i) => {
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
                  {...dataPointFocusProps(a11y.focusedIndex === i)}
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
      <ChartA11yLayer
        a11y={a11y}
        columns={[String(xKey), 'Open', 'High', 'Low', 'Close']}
        rows={tableRows}
      />
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
