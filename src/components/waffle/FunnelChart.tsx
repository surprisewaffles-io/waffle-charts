import { Group } from '@visx/group';
import { memoChart } from './memo';
import { ParentSize } from '@visx/responsive';
import { scaleOrdinal } from '@visx/scale';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { cn } from '../../lib/utils'; // Assuming this exists based on other files
import { ChartA11yLayer, ChartSvgDescription } from './ChartA11y';
import {
  dataPointFocusProps,
  useChartA11y,
  type ChartA11yProps,
} from '../../lib/chart-a11y';
import {
  CHART_A11Y_BASELINE,
  MEMOIZED_PERFORMANCE,
  type ChartMetadata,
} from './metadata-types';

export type FunnelChartProps<T> = ChartA11yProps & {
  data: T[];
  stepKey: keyof T;
  valueKey: keyof T;
  width?: number;
  height?: number;
  className?: string;
  colors?: string[];
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
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
  emptyMessage = 'No data to display',
  ariaLabel,
  ariaDescribedby,
  title,
  description,
  keyboardNavigable,
}: FunnelChartContentProps<T>) {
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Accessors
  const getStep = (d: T) => String(d[stepKey]);
  const getValue = (d: T) => Number(d[valueKey]);

  // A step without a finite value has no width; rows are normalised here so
  // the geometry below never divides by zero or spreads an empty array.
  const safeData = Array.isArray(data) ? data : [];
  const processData = safeData.filter(d => Number.isFinite(getValue(d)));

  // Scales
  const defaultColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
  const colorScale = scaleOrdinal({
    domain: processData.map((_, i) => i),
    range: colors || defaultColors,
  });

  // Calculate geometry. Math.max spread over an empty array yields -Infinity,
  // and an all-zero funnel would divide by zero, so the divisor is floored at 1.
  const maxValue = processData.length ? Math.max(...processData.map(getValue)) : 0;
  const widthDivisor = maxValue > 0 ? maxValue : 1;

  const stepHeight = processData.length ? innerHeight / processData.length : innerHeight;

  const getPoints = (d: T, i: number) => {
    const val = getValue(d);
    // Center the bar/trapezoid
    // Current width proportional to value
    const w = (val / widthDivisor) * innerWidth;
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

    const nextW = nextD ? (getValue(nextD) / widthDivisor) * innerWidth : w; // Rectangular ending or taper? let's keep rect for last step visibility.

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

  // Drop-off between stages is the point of a funnel, so each announcement
  // carries the stage's share of the widest stage — the same ratio the
  // polygon's width already encodes visually.
  const stageShare = (d: T) => Math.round((getValue(d) / widthDivisor) * 100);

  const a11y = useChartA11y({
    chartType: 'Funnel chart',
    itemCount: processData.length,
    itemNoun: 'stage',
    values: processData.map(getValue),
    describeItem: index => {
      const d = processData[index];
      return d ? `${getStep(d)}: ${getValue(d)}, ${stageShare(d)} percent of the largest stage` : '';
    },
    ariaLabel,
    ariaDescribedby,
    title,
    description,
    keyboardNavigable,
  });

  const tableRows = processData.map(d => [getStep(d), getValue(d), `${stageShare(d)}%`]);

  if (width < 50) return null;

  // Guards sit below every hook so the hook count never varies between renders.
  if (processData.length === 0) {
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
          {processData.map((d, i) => {
            return (
              <polygon
                key={i}
                points={getPoints(d, i)}
                fill={colorScale(i)}
                {...dataPointFocusProps(a11y.focusedIndex === i)}
                className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                onMouseEnter={() => {
                  const coords = getPoints(d, i).split(' ');
                  // approximate center
                  // Top Left is coords[0]
                  const topL = coords[0].split(',');
                  showTooltip({
                    tooltipData: d,
                    tooltipLeft: Number(topL[0]) + margin.left + ((getValue(d) / widthDivisor) * innerWidth) / 2,
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

      <ChartA11yLayer
        a11y={a11y}
        columns={[String(stepKey), String(valueKey), 'Share']}
        rows={tableRows}
      />

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

function FunnelChartRoot<T>(props: FunnelChartProps<T>) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 200 }}>
      <ParentSize>
        {({ width, height }) => <FunnelChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  );
}

/** Memoised so a parent re-render with unchanged props skips the layout below.
 *  See `./memo` for what "unchanged" means. (#3) */
export const FunnelChart = memoChart(FunnelChartRoot);

/** Machine-readable description of this chart, for agents and validation. (#10) */
export const FunnelChartMeta = {
  name: 'FunnelChart',
  category: 'composition',
  description:
    'Stacked horizontal bands, each narrowed in proportion to its value, for reading drop-off between ordered stages.',
  dataRequirements: {
    minRows: 2,
    maxRecommended: 8,
    kind: 'rows',
    shape: 'Array<{ [stepKey]: string; [valueKey]: number }>',
    requiredFields: ['step', 'value'],
    fixedFieldNames: false,
    requiredProps: ['data', 'stepKey', 'valueKey'],
    optionalProps: ['colors', 'className', 'emptyMessage'],
    notes:
      'Row order is stage order — the array is not sorted. Band width is relative to the largest value, so pass stages already in descending sequence. Wrap in a container with a height.',
  },
  capabilities: ['responsive', 'tooltip', 'part-to-whole', 'empty-state', 'custom-colors', 'categorical'],
  complexity: 'simple',
  accessibility: CHART_A11Y_BASELINE,
  performance: MEMOIZED_PERFORMANCE,
} as const satisfies ChartMetadata;

export type FunnelChartMetadata = typeof FunnelChartMeta;
