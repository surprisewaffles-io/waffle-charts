import { Group } from '@visx/group';
import { Arc } from '@visx/shape';
import { scaleLinear, scaleOrdinal } from '@visx/scale';
import { ParentSize } from '@visx/responsive';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { cn } from '../../lib/utils';

export type RadialBarChartProps<T> = {
  data: T[];
  valueKey: keyof T;
  labelKey: keyof T; // Used for identifying the ring
  maxValue?: number; // If not provided, calculated from max of data or 100?
  width?: number;
  height?: number;
  className?: string;
  colors?: string[];
  startAngle?: number; // In degrees, 0 is 12 o'clock? D3 is 0 at 12? No, 0 is 12 if mapped correctly. 0 is up usually in Visx usage if we transform. Standard D3 0 is 3 o'clock.
  // Let's use standard d3 angles: 0 is up (if we rotate) or 0 is right.
  // Actually, easiest is: 0 = 12 oclock, 360 = 12 oclock.
  endAngle?: number;
  innerRadius?: number; // 0 to 1, relative to max radius? or absolute pixels?
  // Let's use relative fraction 0-1 for flexibility or just let d3 handle pixels.
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
};

type RadialBarChartContentProps<T> = RadialBarChartProps<T> & {
  width: number;
  height: number;
};

// Helpers
const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

function RadialBarChartContent<T>({
  data,
  width,
  height,
  valueKey,
  labelKey,
  maxValue,
  className,
  colors,
  startAngle = 0,
  endAngle = 360,
  innerRadius: customInnerRadius = 0.2, // 20% of radius empty in middle
  emptyMessage = 'No data to display',
}: RadialBarChartContentProps<T>) {
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const radius = Math.min(innerWidth, innerHeight) / 2;
  const centerX = innerWidth / 2;
  const centerY = innerHeight / 2;

  // Data helpers
  const getValue = (d: T) => Number(d[valueKey]);
  const getLabel = (d: T) => String(d[labelKey]);

  // A ring without a finite value has no arc angle. Rows are normalised here
  // so the geometry below never divides by zero or spreads an empty array.
  const safeData = Array.isArray(data) ? data : [];
  const validData = safeData.filter(d => Number.isFinite(getValue(d)));

  // Math.max spread over an empty array yields -Infinity, which is truthy — a
  // `|| 0` fallback never fires and the angle domain becomes unusable.
  const observedMax = validData.length ? Math.max(...validData.map(getValue)) : 0;
  const calculatedMax = maxValue ?? (observedMax > 0 ? observedMax : 1);

  // Angle Scale (Length of bar)
  // Maps value to angle
  const angleScale = scaleLinear({
    range: [degreesToRadians(startAngle), degreesToRadians(endAngle)],
    domain: [0, calculatedMax > 0 ? calculatedMax : 1],
  });

  // Color Scale
  const defaultColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const colorScale = scaleOrdinal({
    domain: validData.map((_, i) => i),
    range: colors || defaultColors,
  });

  // Radius calculations
  // We need to fit `validData.length` rings between customInnerRadius*radius and radius.
  // Gap between rings?
  const gap = 4;
  const totalRingWidth = radius - (radius * customInnerRadius);
  const ringWidth = validData.length
    ? (totalRingWidth - (gap * (validData.length - 1))) / validData.length
    : totalRingWidth;

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
        <Group top={centerY + margin.top} left={centerX + margin.left}>
          {/* Rotate so 0 is at top if desired? D3 arc 0 is at 12 o'clock? No, 0 is at 12 if using @visx/shape defaults? 
            Visx Arc: startAngle 0 is usually 12 o'clock. 
            Let's assume default mapping.
            */}

          {validData.map((d, i) => {
            // Outer to Inner? Or Inner to Outer?
            // Usually Outer is the first item?
            const outerR = radius - (i * (ringWidth + gap));
            const innerR = outerR - ringWidth;
            const value = getValue(d);
            const barAngle = angleScale(value);
            const backgroundStart = degreesToRadians(startAngle);
            const backgroundEnd = degreesToRadians(endAngle);

            return (
              <Group key={`ring-${i}`}>
                {/* Background Track */}
                <Arc
                  innerRadius={innerR}
                  outerRadius={outerR}
                  startAngle={backgroundStart}
                  endAngle={backgroundEnd}
                  fill="hsl(var(--muted))"
                  opacity={0.2}
                  cornerRadius={3}
                />

                {/* Value Bar */}
                <Arc
                  innerRadius={innerR}
                  outerRadius={outerR}
                  startAngle={backgroundStart}
                  endAngle={barAngle}
                  fill={colorScale(i)}
                  cornerRadius={3}
                  className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                  onMouseEnter={() => {
                    // We need a specific point for tooltip.
                    // Centroid is okay, but mapped to the bar.
                    // Or just mouse coords?
                    // Arc.centroid is complex.
                    // Just use center + radius offset? 
                    // Simple: center of the chart
                    showTooltip({
                      tooltipData: d,
                      tooltipLeft: centerX + margin.left,
                      tooltipTop: centerY + margin.top
                    })
                  }}
                  onMouseLeave={hideTooltip}
                />
              </Group>
            )
          })}
        </Group>
      </svg>

      {/* Center Text (if single value? Or generic legend?) 
            Maybe leave center empty for now unless needed. 
        */}

      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', transform: 'translate(-50%, -50%)', zIndex: 100 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl text-center">
            <div className="font-semibold">{getLabel(tooltipData)}</div>
            <div>{getValue(tooltipData)} / {calculatedMax}</div>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export function RadialBarChart<T>(props: RadialBarChartProps<T>) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 200 }}>
      <ParentSize>
        {({ width, height }) => <RadialBarChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  );
}
