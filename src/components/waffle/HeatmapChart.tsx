import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { HeatmapRect } from '@visx/heatmap';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { useMemo } from 'react';

// Types
export type HeatmapData = {
  bin: number;
  bins: {
    bin: number;
    count: number;
  }[];
};

export type HeatmapChartProps = {
  data: HeatmapData[];
  width?: number;
  height?: number;
  className?: string;
  colorRange?: [string, string]; // Hex colors for min/max
  gap?: number;
};

type HeatmapChartContentProps = HeatmapChartProps & {
  width: number;
  height: number;
};

function HeatmapChartContent({
  data,
  width,
  height,
  className,
  colorRange = ['#e2e8f0', '#0f172a'], // Default slate-200 to slate-900 (using hex for interpolation usually better, but Visx scale accepts colors)
  gap = 2,
}: HeatmapChartContentProps) {
  const margin = { top: 10, right: 10, bottom: 20, left: 20 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Helpers
  const binWidth = xMax / data.length;

  // Scales
  const xScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, data.length],
        range: [0, xMax],
      }),
    [xMax, data],
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, (data && data[0] && data[0].bins) ? data[0].bins.length : 0],
        range: [yMax, 0],
      }),
    [yMax, data],
  );

  // Defensive Check
  if (!Array.isArray(data) || data.length === 0) return null;

  const maxCount = Math.max(...data.flatMap((d) => (d.bins ? d.bins.map((b) => b.count) : [])));
  const colorScale = useMemo(
    () =>
      scaleLinear<string>({
        domain: [0, maxCount],
        range: colorRange,
      }),
    [maxCount, colorRange],
  );

  // Tooltip
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<number>(); // Tooltip data is just the bin count (number)

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  if (width < 10) return null;

  return (
    <div className={cn("relative", className)}>
      <svg ref={containerRef} width={width} height={height} className="overflow-visible">
        <Group left={margin.left} top={margin.top}>
          <HeatmapRect<HeatmapData, { bin: number; count: number }>
            data={data.filter(d => Array.isArray(d.bins))}
            xScale={xScale}
            yScale={yScale}
            colorScale={colorScale}
            binWidth={binWidth}
            binHeight={binWidth}
            gap={gap}
          >
            {(heatmap) =>
              heatmap.map((heatmapBins) =>
                heatmapBins.map((bin) => (
                  <rect
                    key={`heatmap-rect-${bin.row}-${bin.column}`}
                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                    width={bin.width}
                    height={bin.height}
                    x={bin.x}
                    y={bin.y}
                    fill={bin.color}
                    rx={2}
                    onMouseEnter={() => {
                      showTooltip({
                        tooltipData: bin.count ?? 0, // Ensure strictly number
                        tooltipLeft: bin.x + margin.left + bin.width / 2,
                        tooltipTop: bin.y + margin.top,
                      });
                    }}
                    onMouseLeave={() => hideTooltip()}
                  />
                ))
              )
            }
          </HeatmapRect>
        </Group>
      </svg>
      {tooltipOpen && tooltipData !== undefined && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 100 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Value: {tooltipData}</p>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export const HeatmapChart = (props: HeatmapChartProps) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <HeatmapChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
