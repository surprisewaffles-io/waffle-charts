import { useMemo } from 'react';
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
  colors = ['#a855f7', '#ec4899'],
  className,
  showXAxis = true,
  showYAxis = true,
  showGridRows = true,
  showGridColumns = false,
  xAxisLabel,
  yAxisLabel,
  margin: customMargin
}: AreaChartContentProps<T>) {
  // Config
  const defaultMargin = { top: 40, right: 30, bottom: 50, left: 50 };
  const margin = { ...defaultMargin, ...customMargin };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Defensive Check: Ensure data is an array before processing
  if (!Array.isArray(data)) {
    console.warn("AreaChart: data prop is not an array", data);
    return null;
  }

  // Accessors
  const getX = (d: T) => new Date(d[xKey] as string | number | Date);
  const getY0 = (d: unknown) => (d as { [key: string]: number })[0];
  const getY1 = (d: unknown) => (d as { [key: string]: number })[1];


  // Scales
  const xScale = useMemo(
    () =>
      scaleTime({
        range: [0, xMax],
        domain: [Math.min(...data.map(d => getX(d).getTime())), Math.max(...data.map(d => getX(d).getTime()))],
      }),
    [xMax, data, xKey],
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [yMax, 0],
        round: true,
        // Calculate max value from stacked data could be complex, assuming simplistic sum or finding max from data
        // For accurate stacking, we should ideally calculate the max stack value.
        // For this demo, let's just make sure we cover the data range generously.
        domain: [0, Math.max(...data.map(d => keys.reduce((acc, k) => acc + Number(d[k]), 0))) * 1.1],
        nice: true,
      }),
    [yMax, data, keys],
  );

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
    const index = bisectDate(data, x0, 1);
    const d0 = data[index - 1];
    const d1 = data[index];
    let d = d0;
    if (d1 && getX(d1)) {
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
              numTicks={Math.min(5, data.length)}
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
            data={data}
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

export const AreaChart = <T,>(props: AreaChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <AreaChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
