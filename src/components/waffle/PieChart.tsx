import { Pie } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleOrdinal } from '@visx/scale';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { useState } from 'react';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { arc as d3arc } from 'd3-shape'; // Direct import for custom arc generation

// Types
export type PieChartProps<T> = {
  data: T[];
  valueKey: keyof T;
  labelKey: keyof T; // Used for tooltip or legend
  width?: number;
  height?: number;
  className?: string; // Wrapper class
  innerRadius?: number; // 0 for Pie, >0 for Donut
  colors?: string[]; // CSS variable strings or hex
  centerText?: {
    title: string;
    subtitle?: string;
  };
  margin?: { top: number; right: number; bottom: number; left: number };
};

type PieChartContentProps<T> = PieChartProps<T> & {
  width: number;
  height: number;
};

function PieChartContent<T>({
  data,
  width,
  height,
  valueKey,
  labelKey,
  className,
  innerRadius = 0, // Default to full pie
  colors,
  centerText,
  margin: customMargin
}: PieChartContentProps<T>) {
  const defaultMargin = { top: 20, right: 20, bottom: 20, left: 20 };
  const margin = { ...defaultMargin, ...customMargin };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const radius = Math.min(innerWidth, innerHeight) / 2;
  const centerY = innerHeight / 2;
  const centerX = innerWidth / 2;

  // Accessors
  const getValue = (d: T) => Number(d[valueKey]);

  // Scales (Color)
  // We prefer using CSS classes/variables, but Visx Pie returns arcs.
  // We will map index to a Tailwind color class if provided, or default ordinals.
  const defaultColors = ['text-primary', 'text-blue-500', 'text-indigo-500', 'text-sky-500', 'text-cyan-500']
  const colorScale = scaleOrdinal({
    domain: data.map((_, i) => i),
    range: colors || defaultColors,
  });

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
    detectBounds: true,
  });

  // Interaction State
  const [activeShape, setActiveShape] = useState<number | null>(null);

  if (width < 10 || height < 100) return null;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg ref={containerRef} width={width} height={height} className="overflow-visible">
        <Group top={centerY + margin.top} left={centerX + margin.left}>
          <Pie
            data={data}
            pieValue={getValue}
            outerRadius={radius}
            innerRadius={innerRadius}
            padAngle={0.02}
            cornerRadius={3}
          >
            {(pie) => {
              return pie.arcs.map((arc, index) => {
                const [centroidX, centroidY] = pie.path.centroid(arc);
                const isHovered = activeShape === index;
                const currentOuterRadius = isHovered ? radius + 5 : radius;

                // Create custom arc generator for hover effect
                // Create custom arc generator for hover effect
                const arcGenerator = d3arc().cornerRadius(3);
                // @ts-ignore - d3 types might still complain about explicit config matching
                const arcPath = arcGenerator({
                  innerRadius,
                  outerRadius: currentOuterRadius,
                  startAngle: arc.startAngle,
                  endAngle: arc.endAngle,
                  padAngle: arc.padAngle,
                });

                return (
                  <g key={`arc-${index}`}>
                    <path
                      d={arcPath || ''}
                      fill={String(colorScale(index)).startsWith('#') ? String(colorScale(index)) : undefined}
                      className={cn("fill-current transition-all duration-300 cursor-pointer hover:opacity-80", !String(colorScale(index)).startsWith('#') && colorScale(index))}
                      // If colors are passed as specific colors (not classes), you might use fill={...} instead. 
                      // This implementation supports both hex colors and Tailwind TEXT color classes (e.g. 'text-blue-500'),
                      // which fill-current will inherit.
                      onMouseEnter={() => {
                        setActiveShape(index);
                        showTooltip({
                          tooltipData: arc.data,
                          tooltipLeft: centroidX + centerX + margin.left,
                          tooltipTop: centroidY + centerY + margin.top,
                        })
                      }}
                      onMouseLeave={() => {
                        setActiveShape(null);
                        hideTooltip();
                      }}
                    />
                  </g>
                )
              })
            }}
          </Pie>

          {/* Center Text (Donut only) */}
          {innerRadius > 0 && centerText && (
            <text
              textAnchor="middle"
              pointerEvents="none"
            >
              <tspan x="0" dy="-0.5em" className="fill-foreground text-2xl font-bold">{centerText.title}</tspan>
              {centerText.subtitle && (
                <tspan x="0" dy="1.5em" className="fill-muted-foreground text-sm uppercase tracking-wider">{centerText.subtitle}</tspan>
              )}
            </text>
          )}

        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 100 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl">
            <p className="font-semibold">{String(getValue(tooltipData))}</p>
            <p className="text-xs text-muted-foreground">{String(tooltipData[labelKey])}</p>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export const PieChart = <T,>(props: PieChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <PieChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
