import { Chord, Ribbon } from '@visx/chord';
import { memoChart } from './memo';
import { scaleOrdinal } from '@visx/scale';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { Arc } from '@visx/shape';
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
import { useMemo, useState, useRef } from 'react';
import { Group } from '@visx/group';
import { localPoint } from '@visx/event';

// Types
export type ChordChartProps = ChartA11yProps & {
  data: number[][];
  keys: string[];
  width?: number;
  height?: number;
  className?: string;
  colorScheme?: string[];
  /** Rendered in place of the chart when `data` holds no usable matrix. */
  emptyMessage?: string;
};

type ChordChartContentProps = ChordChartProps & {
  width: number;
  height: number;
};

function ChordChartContent({
  data,
  keys,
  width,
  height,
  className,
  colorScheme = ['#a855f7', '#ec4899', '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444'],
  emptyMessage = 'No data to display',
  ariaLabel,
  ariaDescribedby,
  title,
  description,
  keyboardNavigable,
}: ChordChartContentProps) {
  // Calculate radius adaptively based on available space
  const centerSize = Math.min(width, height);
  const padding = Math.min(40, centerSize * 0.2); // Dynamic padding that scales with size
  const outerRadius = Math.max(10, centerSize * 0.5 - padding);
  const innerRadius = Math.max(5, outerRadius - 20);

  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  const [activeRibbon, setActiveRibbon] = useState<number | null>(null);

  // Every hook below runs unconditionally. d3's chord layout indexes the
  // matrix as a square, so a ragged or non-numeric one is padded here rather
  // than guarded with an early return above the hooks, which would change the
  // hook count between renders.
  const matrix = useMemo(() => {
    const rows = Array.isArray(data) ? data.filter(Array.isArray) : [];
    const size = rows.length;
    return rows.map(row =>
      Array.from({ length: size }, (_, i) => (Number.isFinite(Number(row[i])) ? Number(row[i]) : 0)),
    );
  }, [data]);

  // A matrix whose every cell is zero produces zero-width arcs.
  const hasFlow = useMemo(
    () => matrix.some(row => row.some(value => value > 0)),
    [matrix],
  );

  const colorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: keys,
        range: colorScheme,
      }),
    [keys, colorScheme]
  );

  // Tooltip
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<{ label: string; value: number }>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  // Use a local ref to access the SVG element for bounding rect
  const svgRef = useRef<SVGSVGElement>(null);

  const setRefs = (node: SVGSVGElement | null) => {
    containerRef(node);
    svgRef.current = node;
  };

  // A group's arc length is its total flow, so the row totals of the matrix are
  // the same quantity the reader sees as arc size. Ribbons are traversed
  // through the group they leave, which keeps one cursor over the whole chart.
  const groupTotals = useMemo(() => matrix.map(row => row.reduce((sum, v) => sum + v, 0)), [matrix]);

  const a11y = useChartA11y({
    chartType: 'Chord diagram',
    itemCount: groupTotals.length,
    itemNoun: 'group',
    values: groupTotals,
    describeItem: index => {
      const total = groupTotals[index] ?? 0;
      const flows = matrix[index]
        ?.map((value, target) => (value > 0 ? `${keys[target] ?? target}: ${value}` : null))
        .filter(Boolean)
        .join(', ');
      return `${keys[index] ?? index}, total ${total}. Flows to ${flows || 'nothing'}`;
    },
    ariaLabel,
    ariaDescribedby,
    title,
    description,
    keyboardNavigable,
  });

  const tableRows = useMemo(
    () => groupTotals.map((total, i) => [keys[i] ?? String(i), total]),
    [groupTotals, keys],
  );

  // The keyboard cursor dims the rest of the diagram exactly as hover does, so
  // a sighted keyboard user gets the same isolation a mouse user gets.
  const highlightedGroup = activeGroup ?? (a11y.focusedIndex >= 0 ? a11y.focusedIndex : null);

  if (width < 50) return null;

  // Guards sit below every hook so the hook count never varies between renders.
  if (!hasFlow) {
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
    <div className={cn("relative font-sans", className)}>
      <svg
        {...a11y.svgProps}
        ref={setRefs}
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
        <Group top={height / 2} left={width / 2}>
          <Chord matrix={matrix} padAngle={0.05} sortSubgroups={(a, b) => b - a}>
            {({ chords }) => (
              <g>
                {/* Ribbons */}
                {chords.groups.map((group, i) => (
                  <Arc
                    key={`arc-${i}`}
                    data={group}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    fill={colorScale(keys[i])}
                    {...dataPointFocusProps(a11y.focusedIndex === i)}
                    className="transition-opacity duration-200 cursor-pointer"
                    opacity={
                      (highlightedGroup !== null && highlightedGroup !== i) ||
                        (activeRibbon !== null &&
                          chords[activeRibbon].source.index !== i &&
                          chords[activeRibbon].target.index !== i)
                        ? 0.3
                        : 1
                    }
                    onMouseEnter={() => setActiveGroup(i)}
                    onMouseLeave={() => setActiveGroup(null)}
                  />
                ))}

                {chords.map((chord, i) => (
                  <Ribbon
                    key={`ribbon-${i}`}
                    chord={chord}
                    radius={innerRadius}
                    fill={colorScale(keys[chord.source.index])}
                    fillOpacity={0.75}
                    className="transition-all duration-200 hover:fill-opacity-100"
                    opacity={
                      (highlightedGroup !== null &&
                        highlightedGroup !== chord.source.index &&
                        highlightedGroup !== chord.target.index) ||
                        (activeRibbon !== null && activeRibbon !== i)
                        ? 0.1
                        : 0.75
                    }
                    onMouseEnter={() => setActiveRibbon(i)}
                    onMouseLeave={() => {
                      setActiveRibbon(null);
                      hideTooltip();
                    }}
                    onMouseMove={(event) => {
                      const coords = localPoint(event);
                      if (!coords) return;

                      setActiveRibbon(i);
                      showTooltip({
                        tooltipData: {
                          label: `${keys[chord.source.index]} ↔ ${keys[chord.target.index]}`,
                          value: chord.source.value
                        },
                        tooltipLeft: coords.x,
                        tooltipTop: coords.y,
                      });
                    }}
                  />
                ))}
              </g>
            )}
          </Chord>
        </Group>
      </svg>

      <ChartA11yLayer a11y={a11y} columns={['Group', 'Total flow']} rows={tableRows} />

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 100 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl pointer-events-none">
            <span className="font-semibold block">{tooltipData.label}</span>
            <span className="text-xs text-muted-foreground">Flow: {tooltipData.value}</span>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

const ChordChartRoot = (props: ChordChartProps) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <ChordChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  );
}

/** Memoised so a parent re-render with unchanged props skips the visx layout
 *  below. See `./memo` for what "unchanged" means. (#3) */
export const ChordChart = memoChart(ChordChartRoot);

/** Machine-readable description of this chart, for agents and validation. (#10) */
export const ChordChartMeta = {
  name: 'ChordChart',
  category: 'relationship',
  description:
    'A circle of arcs joined by ribbons whose width is the volume exchanged between each pair, read from a square matrix.',
  dataRequirements: {
    minRows: 2,
    maxRecommended: 12,
    kind: 'matrix',
    shape: 'number[][] — a square matrix, plus keys: string[] naming each index',
    requiredFields: [],
    fixedFieldNames: false,
    requiredProps: ['data', 'keys'],
    optionalProps: ['colorScheme', 'className', 'emptyMessage'],
    notes:
      '`data[i][j]` is the flow from group i to group j. A ragged or non-numeric matrix is padded with zeros to a square. `keys` must be as long as the matrix side. An all-zero matrix renders the empty state.',
  },
  capabilities: ['responsive', 'tooltip', 'matrix', 'empty-state', 'custom-colors'],
  complexity: 'complex',
  accessibility: CHART_A11Y_BASELINE,
  performance: MEMOIZED_PERFORMANCE,
} as const satisfies ChartMetadata;

export type ChordChartMetadata = typeof ChordChartMeta;
