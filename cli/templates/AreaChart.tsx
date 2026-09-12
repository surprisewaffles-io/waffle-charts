import { useCallback, useMemo } from 'react';
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
  keys,
  colors = ['text-blue-500', 'text-indigo-500', 'text-purple-500'],
  className,
  emptyMessage = 'No data to display',
}: AreaChartContentProps<T>) {
  // Config
  const margin = { top: 40, right: 30, bottom: 50, left: 50 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Every hook below runs unconditionally, and the empty-data guard sits after
  // them, so the hook count never varies between renders.
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Accessors. getX is memoised so the scale memos below actually cache.
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

  if (width < 10) return null;

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
          <GridRows scale={yScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border))" />
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

          <AreaStack
            data={validData}
            keys={keys as string[]}
            x={d => xScale(getX(d.data)) ?? 0}
            y0={d => yScale(getY0(d)) ?? 0}
            y1={d => yScale(getY1(d)) ?? 0}
          >
            {({ stacks, path }) =>
              stacks.map((stack, i) => (
                <path
                  key={`stack-${stack.key}`}
                  d={path(stack) || ''}
                  stroke="transparent"
                  // Use currentColor to inherit color from text-class
                  className={cn("fill-current opacity-80 hover:opacity-100 transition-opacity", colors[i % colors.length])}
                />
              ))
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
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent' }}
        >
          <div className="rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
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

export const AreaChart = <T,>(props: AreaChartProps<T>) => {
  return (
    <div className="w-full h-[300px]">
      <ParentSize>
        {({ width, height }) => <AreaChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
