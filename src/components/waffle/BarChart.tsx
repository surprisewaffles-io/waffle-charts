import { useMemo } from 'react';
import { Bar, BarStack, BarGroup } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { GridRows, GridColumns } from '@visx/grid';

// Types
export type BarChartProps<T> = {
  data: T[];
  xKey: keyof T;
  yKey?: keyof T; // Optional if using keys

  // Advanced Config
  variant?: 'simple' | 'stacked' | 'grouped';
  keys?: string[]; // Keys for stacked/grouped
  colors?: string[]; // Array of colors corresponding to keys

  className?: string;
  barColor?: string; // Default color for simple bar
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
  yDomain?: [number, number];
  tickFormat?: (value: string, index: number) => string;
  onClick?: (data: T) => void;
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
  variant = 'simple',
  keys = [],
  colors: palette = ['#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'],
  className,
  barColor = "#a855f7",
  showXAxis = true,
  showYAxis = true,
  showGridRows = true,
  showGridColumns = false,
  xAxisLabel,
  yAxisLabel,
  margin: customMargin,
  yDomain,
  tickFormat,
  onClick,
}: BarChartContentProps<T>) {
  // Config
  const defaultMargin = { top: 40, right: 30, bottom: 50, left: 50 };
  const margin = { ...defaultMargin, ...customMargin };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Accessors
  const getX = (d: T) => String(d[xKey]);
  // Helper for simple bar
  const getY = (d: T) => yKey ? Number(d[yKey]) : 0;

  // Effective Keys and Colors
  const effectiveKeys = keys.length > 0 ? keys : (yKey ? [String(yKey)] : []);

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

  // Grouped Scale (Sub-scale)
  const x1Scale = useMemo(
    () =>
      scaleBand<string>({
        domain: effectiveKeys,
        padding: 0.1,
        range: [0, xScale.bandwidth()],
      }),
    [xScale, effectiveKeys],
  );

  const yScale = useMemo(
    () => {
      let maxY = 0;
      if (variant === 'stacked') {
        // Calculate max stack
        // Using any cast to handle generic complexity
        maxY = Math.max(...data.map(d => effectiveKeys.reduce((acc, k) => acc + (Number((d as any)[k]) || 0), 0)));
      } else if (variant === 'grouped') {
        // Calculate max group value
        maxY = Math.max(...data.map(d => Math.max(...effectiveKeys.map(k => Number((d as any)[k]) || 0))));
      } else {
        // Simple
        maxY = Math.max(...data.map(getY));
      }

      return scaleLinear<number>({
        range: [yMax, 0],
        round: true,
        domain: yDomain || [0, maxY * 1.1],
      });
    },
    [yMax, data, variant, effectiveKeys, yKey, yDomain],
  );

  // Tooltip
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<any>(); // simplify type for complex tooltip data

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  if (width < 10 || height < 100) return null;

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* Legend (if multi-series) */}
      {(variant === 'stacked' || variant === 'grouped') && (
        <div className="flex flex-wrap gap-4 mb-2">
          {effectiveKeys.map((k, i) => (
            <div key={k} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: palette[i % palette.length] }}
              />
              <span className="text-xs text-muted-foreground font-medium capitalize">{k}</span>
            </div>
          ))}
        </div>
      )}

      <svg ref={containerRef} width={width} height={height} className="overflow-visible">
        <Group left={margin.left} top={margin.top}>
          {(showGridRows || showGridColumns) && (
            <Group>
              {showGridRows && <GridRows scale={yScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border))" strokeOpacity={0.5} pointerEvents="none" />}
              {showGridColumns && <GridColumns scale={xScale} width={xMax} height={yMax} strokeDasharray="3,3" stroke="hsl(var(--border, 214.3 31.8% 91.4%))" strokeOpacity={0.5} pointerEvents="none" />}
            </Group>
          )}

          {showXAxis && (
            <AxisBottom
              top={yMax}
              scale={xScale}
              stroke="hsl(var(--border, 214.3 31.8% 91.4%))"
              tickStroke="hsl(var(--border, 214.3 31.8% 91.4%))"
              label={xAxisLabel}
              tickFormat={tickFormat}
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
                dy: 4,
              }}
              numTicks={5}
            />
          )}

          {/* Stacked Variant */}
          {variant === 'stacked' && (
            <BarStack
              data={data}
              keys={effectiveKeys}
              x={getX}
              xScale={xScale}
              yScale={yScale}
              color={(k) => palette[effectiveKeys.indexOf(String(k)) % palette.length]}
            >
              {barStacks =>
                barStacks.map(barStack =>
                  barStack.bars.map(bar => (
                    <rect
                      key={`bar-stack-${barStack.index}-${bar.index}`}
                      x={bar.x}
                      y={bar.y}
                      height={bar.height}
                      width={bar.width}
                      fill={bar.color}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                      onClick={() => onClick?.(bar.bar.data)}
                      onMouseLeave={() => hideTooltip()}
                      onMouseMove={(event) => {
                        const { x, y } = localPoint(event) || { x: 0, y: 0 };
                        showTooltip({
                          tooltipData: { type: 'stacked', bar, key: bar.key },
                          tooltipTop: y,
                          tooltipLeft: x,
                        });
                      }}
                    />
                  ))
                )
              }
            </BarStack>
          )}

          {/* Grouped Variant */}
          {variant === 'grouped' && (
            <BarGroup
              data={data as any[]}
              keys={effectiveKeys}
              height={yMax}
              x0={getX as any}
              x0Scale={xScale}
              x1Scale={x1Scale}
              yScale={yScale}
              color={(k) => palette[effectiveKeys.indexOf(String(k)) % palette.length]}
            >
              {barGroups =>
                barGroups.map(barGroup => (
                  <Group key={`bar-group-${barGroup.index}-${barGroup.x0}`} left={barGroup.x0}>
                    {barGroup.bars.map(bar => (
                      <rect
                        key={`bar-group-bar-${barGroup.index}-${bar.index}-${bar.key}`}
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                        fill={bar.color}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                        onClick={() => onClick?.(data[barGroup.index])}
                        onMouseLeave={() => hideTooltip()}
                        onMouseMove={(event) => {
                          const { x, y } = localPoint(event) || { x: 0, y: 0 };
                          showTooltip({
                            tooltipData: { type: 'grouped', bar, key: bar.key, data: data[barGroup.index] },
                            tooltipTop: y,
                            tooltipLeft: x + barGroup.x0,
                          });
                        }}
                      />
                    ))}
                  </Group>
                ))
              }
            </BarGroup>
          )}

          {/* Simple Variant (Default) */}
          {variant === 'simple' && data.map((d) => {
            const letter = getX(d);
            const barWidth = xScale.bandwidth();
            const barHeight = yMax - (yScale(getY(d)) ?? 0);
            const barX = xScale(letter);
            const barY = yMax - barHeight;
            const isHex = barColor.startsWith('#') || barColor.startsWith('rgb');
            return (
              <Bar
                key={`bar-${letter}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={isHex ? barColor : undefined}
                className={cn("transition-all duration-300 hover:opacity-80 cursor-pointer", !isHex && barColor)}
                onClick={() => onClick?.(d)}
                onMouseLeave={() => hideTooltip()}
                onMouseMove={(event) => {
                  const eventSvgCoords = localPoint(event);
                  const left = barX! + barWidth / 2;
                  showTooltip({
                    tooltipData: { type: 'simple', d },
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
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 100 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl">
            {/* Custom Tooltip Logic based on Variant */}
            {tooltipData.type === 'simple' ? (
              <>
                <p className="font-semibold">{String(getY(tooltipData.d))}</p>
                <p className="text-xs text-muted-foreground">{String(getX(tooltipData.d))}</p>
              </>
            ) : tooltipData.type === 'stacked' ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: tooltipData.bar.color }} />
                  <span className="text-xs font-semibold capitalize">{tooltipData.key}</span>
                </div>
                <p className="text-lg font-bold">{tooltipData.bar.bar ? tooltipData.bar.bar.data[tooltipData.key] : '?'}</p>
              </>
            ) : tooltipData.type === 'grouped' ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: tooltipData.bar.color }} />
                  <span className="text-xs font-semibold capitalize">{tooltipData.key}</span>
                </div>
                <p className="text-lg font-bold">{tooltipData.bar.value}</p>
              </>
            ) : null}
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
