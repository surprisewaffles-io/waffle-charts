import { Pie } from '@visx/shape';
import { memoChart } from './memo';
import { Group } from '@visx/group';
import { scaleOrdinal } from '@visx/scale';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { useState } from 'react';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
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
import { arc as d3arc } from 'd3-shape'; // Direct import for custom arc generation

// Types
export type PieChartProps<T> = ChartA11yProps & {
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
  onClick?: (data: T) => void;
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
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
  margin: customMargin,
  onClick,
  emptyMessage = 'No data to display',
  ariaLabel,
  ariaDescribedby,
  title,
  description,
  keyboardNavigable,
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

  // A slice needs a finite, positive value to occupy any angle. Rows are
  // normalised here so the arcs below never receive NaN.
  const safeData = Array.isArray(data) ? data : [];
  const validData = safeData.filter(d => Number.isFinite(getValue(d)) && getValue(d) > 0);

  // Scales (Color)
  // We prefer using CSS classes/variables, but Visx Pie returns arcs.
  // We will map index to a Tailwind color class if provided, or default ordinals.
  const defaultColors = ['text-primary', 'text-blue-500', 'text-indigo-500', 'text-sky-500', 'text-cyan-500']
  const colorScale = scaleOrdinal({
    domain: validData.map((_, i) => i),
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

  // A slice means little in isolation; its share of the whole is the number a
  // reader actually wants, so both the summary and each announcement carry it.
  const pieTotal = validData.reduce((sum, d) => sum + getValue(d), 0);
  const share = (d: T) => (pieTotal > 0 ? Math.round((getValue(d) / pieTotal) * 100) : 0);

  const a11y = useChartA11y({
    chartType: innerRadius > 0 ? 'Donut chart' : 'Pie chart',
    itemCount: validData.length,
    itemNoun: 'slice',
    values: validData.map(getValue),
    describeItem: index => {
      const d = validData[index];
      return d ? `${String(d[labelKey])}: ${getValue(d)}, ${share(d)} percent` : '';
    },
    onActivate: index => {
      const d = validData[index];
      if (d) onClick?.(d);
    },
    ariaLabel,
    ariaDescribedby,
    title,
    description,
    keyboardNavigable,
  });

  const tableRows = validData.map(d => [String(d[labelKey]), getValue(d), `${share(d)}%`]);

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
    <div className={cn("relative flex items-center justify-center", className)}>
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
        <Group top={centerY + margin.top} left={centerX + margin.left}>
          <Pie
            data={validData}
            pieValue={getValue}
            outerRadius={radius}
            innerRadius={innerRadius}
            padAngle={0.02}
            cornerRadius={3}
          >
            {(pie) => {
              return pie.arcs.map((arc, index) => {
                const [centroidX, centroidY] = pie.path.centroid(arc);
                const isKeyboardFocused = a11y.focusedIndex === index;
                // The keyboard cursor lifts the slice exactly as hover does, so
                // a sighted keyboard user sees the same cue a mouse user gets.
                const isHovered = activeShape === index || isKeyboardFocused;
                const currentOuterRadius = isHovered ? radius + 5 : radius;

                // Create custom arc generator for hover effect
                const arcGenerator = d3arc().cornerRadius(3);
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
                      {...dataPointFocusProps(isKeyboardFocused)}
                      className={cn("fill-current transition-all duration-300 cursor-pointer hover:opacity-80", !String(colorScale(index)).startsWith('#') && colorScale(index))}
                      // If colors are passed as specific colors (not classes), you might use fill={...} instead. 
                      // This implementation supports both hex colors and Tailwind TEXT color classes (e.g. 'text-blue-500'),
                      // which fill-current will inherit.
                      onClick={() => onClick?.(arc.data)}
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
      <ChartA11yLayer
        a11y={a11y}
        columns={[String(labelKey), String(valueKey), 'Share']}
        rows={tableRows}
      />
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

const PieChartRoot = <T,>(props: PieChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <PieChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}

/** Memoised so a parent re-render with unchanged props skips the visx layout
 *  below. See `./memo` for what "unchanged" means. (#3) */
export const PieChart = memoChart(PieChartRoot);

/** Machine-readable description of this chart, for agents and validation. (#10) */
export const PieChartMeta = {
  name: 'PieChart',
  category: 'composition',
  description:
    'Arcs sized by share of the total. Set `innerRadius` above zero to render a donut with optional centre text.',
  dataRequirements: {
    minRows: 2,
    maxRecommended: 7,
    kind: 'rows',
    shape: 'Array<{ [labelKey]: string; [valueKey]: number }>',
    requiredFields: ['label', 'value'],
    fixedFieldNames: false,
    requiredProps: ['data', 'labelKey', 'valueKey'],
    optionalProps: ['innerRadius', 'colors', 'centerText', 'className', 'emptyMessage'],
    notes:
      'Only rows with a finite value greater than zero occupy an arc; zero and negative rows are dropped. Past about seven slices the arcs stop being readable — use a bar chart instead.',
  },
  capabilities: ['responsive', 'tooltip', 'part-to-whole', 'empty-state', 'custom-colors', 'categorical'],
  complexity: 'simple',
  accessibility: CHART_A11Y_BASELINE,
  performance: MEMOIZED_PERFORMANCE,
} as const satisfies ChartMetadata;

export type PieChartMetadata = typeof PieChartMeta;
