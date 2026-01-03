import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleOrdinal } from '@visx/scale';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { cn } from '../../lib/utils'; // Assuming this exists based on other files

export type FunnelChartProps<T> = {
  data: T[];
  stepKey: keyof T;
  valueKey: keyof T;
  width?: number;
  height?: number;
  className?: string;
  colors?: string[];
};

type FunnelChartContentProps<T> = FunnelChartProps<T> & {
  width: number;
  height: number;
};

function FunnelChartContent<T>({
  data,
  width,
  height,
  stepKey,
  valueKey,
  className,
  colors,
}: FunnelChartContentProps<T>) {
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Accessors
  const getStep = (d: T) => String(d[stepKey]);
  const getValue = (d: T) => Number(d[valueKey]);

  // Scales
  const defaultColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
  const colorScale = scaleOrdinal({
    domain: data.map((_, i) => i),
    range: colors || defaultColors,
  });

  // Calculate geometry
  // Calculate geometry
  const maxValue = Math.max(...data.map(getValue));
  const processData = data;

  const stepHeight = innerHeight / processData.length;

  const getPoints = (d: T, i: number) => {
    const val = getValue(d);
    // Center the bar/trapezoid
    // Current width proportional to value
    const w = (val / maxValue) * innerWidth;
    const y = i * stepHeight;

    // Next width (for trapezoid effect)
    // If it's the last one, maybe it just goes down to a point or same width? 
    // Let's do simple stacked rectangles first for "Bar Funnel" or proper Trapezoids.
    // Proper Funnel: 
    // Top Left: x, y
    // Top Right: x + w, y
    // Bottom Right: ? 
    // Bottom Left: ?

    // Actually, a nice funnel connects to the next one.
    const nextD = processData[i + 1];
    // Let's just make it a polygon.

    // Coords for current "Row"
    // We want the TOP of this shape to match the BOTTOM of the previous? 
    // Simplified: visual trapezoids.
    // Top width = current Value
    // Bottom width = next Value (or current Value if we want blocks)
    // But usually funnel means flow.

    // Let's do: Top of shape = proportional to current value. Bottom of shape = proportional to next value.
    // For the last item, bottom = proportional to its own value (rect) or 0 (point).
    // Let's assume the last item maintains width to show "conversion".

    const nextW = nextD ? (getValue(nextD) / maxValue) * innerWidth : w; // Rectangular ending or taper? let's keep rect for last step visibility.

    const topX = (innerWidth - w) / 2;
    const topY = y;

    const bottomX = (innerWidth - nextW) / 2;
    const bottomY = y + stepHeight; // minus a gap?

    // Polygon points: TopL, TopR, BottomR, BottomL
    return [
      [topX, topY],
      [topX + w, topY],
      [bottomX + nextW, bottomY],
      [bottomX, bottomY]
    ].map(p => p.join(',')).join(' ');
  };

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
    detectBounds: true
  });

  if (width < 50) return null;

  return (
    <div className={cn("relative", className)}>
      <svg ref={containerRef} width={width} height={height} className="overflow-visible">
        <Group left={margin.left} top={margin.top}>
          {processData.map((d, i) => {
            return (
              <polygon
                key={i}
                points={getPoints(d, i)}
                fill={colorScale(i)}
                className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                onMouseEnter={() => {
                  const coords = getPoints(d, i).split(' ');
                  // approximate center
                  // Top Left is coords[0]
                  const topL = coords[0].split(',');
                  showTooltip({
                    tooltipData: d,
                    tooltipLeft: Number(topL[0]) + margin.left + ((getValue(d) / maxValue) * innerWidth) / 2,
                    tooltipTop: Number(topL[1]) + margin.top + stepHeight / 2
                  })
                }}
                onMouseLeave={hideTooltip}
              />
            );
          })}

          {/* Labels on top? */}
          {processData.map((d, i) => {
            const val = getValue(d);
            const y = i * stepHeight + stepHeight / 2;

            if (stepHeight < 20) return null; // Hide if too small

            return (
              <text
                key={`label-${i}`}
                x={innerWidth / 2}
                y={y}
                dy=".35em"
                textAnchor="middle"
                className="fill-white text-xs font-medium pointer-events-none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                {getStep(d)} ({val})
              </text>
            )
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
            <div className="font-semibold">{getStep(tooltipData)}</div>
            <div>Value: {getValue(tooltipData)}</div>
            {/* Calculation of conversion rate could go here if we had index access easily or passed standard props */}
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export function FunnelChart<T>(props: FunnelChartProps<T>) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 200 }}>
      <ParentSize>
        {({ width, height }) => <FunnelChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  );
}
