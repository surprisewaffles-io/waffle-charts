import { useCallback, useMemo } from 'react';
import { memoChart } from './memo';
import { AreaStack } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { bisector } from 'd3-array';

export type AreaChartProps<T> = {
  data: T[];
  xKey: keyof T;
  keys: (keyof T)[]; // Keys to stack
  colors?: string[]; // CSS text-color classes
  className?: string;
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
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
};

type AreaChartContentProps<T> = AreaChartProps<T> & {
  width: number;
  height: number;
};

function AreaChartContent<T>({
  data,
  width,
  height,
  xKey,
  keys = [],
  colors = ['#a855f7', '#ec4899'],
  className,
  showXAxis = true,
  showYAxis = true,
  showGridRows = true,
  showGridColumns = false,
  xAxisLabel,
  yAxisLabel,
  margin: customMargin,
  emptyMessage = 'No data to display',
}: AreaChartContentProps<T>) {
  // Config
  const defaultMargin = { top: 40, right: 30, bottom: 50, left: 50 };
  const margin = { ...defaultMargin, ...customMargin };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Every hook below runs unconditionally. `data` is normalised to an array
  // here rather than guarded with an early return, because an early return
  // placed above these hooks changes the hook count between renders.
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Accessors. getX is memoised so the scale memos below actually cache —
  // a fresh closure each render would invalidate them on every pass.
  const getX = useCallback((d: T) => new Date(d[xKey] as string | number | Date), [xKey]);
  const getY0 = (d: unknown) => (d as { [key: string]: number })[0];
  const getY1 = (d: unknown) => (d as { [key: string]: number })[1];

  // Rows whose xKey does not parse to a real date cannot be positioned.
  const validData = useMemo(
    () => safeData.filter(d => !Number.isNaN(getX(d).getTime())),
    [safeData, getX],
  );

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
    const totals = validData.map(d => keys.reduce((acc, k) => acc + (Number(d[k]) || 0), 0));
    const peak = totals.length ? Math.max(...totals) : 0;
    return scaleLinear<number>({
      range: [yMax, 0],
      round: true,
      domain: [0, peak > 0 ? peak * 1.1 : 100],
      nice: true,
    });
  }, [yMax, validData, keys]);

  // Tooltip - Simplified for AreaStack (just showing nearest X for now)
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

  const bisectDate = bisector<T, Date>(d => getX(d)).left;

  const handleTooltip = (event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    const { x } = localPoint(event) || { x: 0 };
    const x0 = xScale.invert(x - margin.left);
    const index = bisectDate(validData, x0, 1);
    const d0 = validData[index - 1];
    const d1 = validData[index];
    let d = d0;
    if (d0 && d1) {
      d = x0.valueOf() - getX(d0).valueOf() > getX(d1).valueOf() - x0.valueOf() ? d1 : d0;
    }

    if (d) {
      showTooltip({
        tooltipData: d,
        tooltipLeft: xScale(getX(d)) + margin.left,
        tooltipTop: yScale(0) + margin.top, // Snap to bottom or follow mouse
      });
    }
  };

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
              numTicks={Math.min(5, validData.length)}
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

          <AreaStack
            data={validData}
            keys={keys as string[]}
            x={d => xScale(getX(d.data)) ?? 0}
            y0={d => yScale(getY0(d)) ?? 0}
            y1={d => yScale(getY1(d)) ?? 0}
          >
            {({ stacks, path }) =>
              stacks.map((stack, i) => {
                const color = colors[i % colors.length];
                const isHex = color.startsWith('#');
                return (
                  <path
                    key={`stack-${stack.key}`}
                    d={path(stack) || ''}
                    stroke="transparent"
                    fill={isHex ? color : undefined}
                    // Use currentColor to inherit color from text-class only if not hex
                    className={cn("opacity-80 hover:opacity-100 transition-opacity", !isHex && "fill-current", !isHex && color)}
                  />
                )
              })
            }
          </AreaStack>

          {/* Invisible Overlay for Tooltip */}
          <rect
            x={0}
            y={0}
            width={xMax}
            height={yMax}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={() => hideTooltip()}
          />
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 50 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-lg">
            <p className="font-semibold text-xs text-muted-foreground mb-1">{getX(tooltipData).toLocaleDateString()}</p>
            {keys.map((key, i) => (
              <div key={key as string} className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full bg-current", colors[i % colors.length])} />
                <span className="text-xs capitalize">{key as string}:</span>
                <span className="font-mono text-xs font-bold">{String(tooltipData[key])}</span>
              </div>
            ))}
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

const AreaChartRoot = <T,>(props: AreaChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <AreaChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}

/** Memoised so a parent re-render with unchanged props skips the visx layout
 *  below. See `./memo` for what "unchanged" means. (#3) */
export const AreaChart = memoChart(AreaChartRoot);
