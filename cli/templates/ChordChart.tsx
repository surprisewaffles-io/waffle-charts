import { Chord, Ribbon } from '@visx/chord';
import { scaleOrdinal } from '@visx/scale';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { Arc } from '@visx/shape';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { useId, useMemo, useState, useRef } from 'react';
import { Group } from '@visx/group';

// Types
export type ChordChartProps = {
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

/**
 * Why: A ribbon's gradient has to run between the two arcs the ribbon joins,
 * but a chord subgroup is described by angles, not by coordinates.
 * What: Maps a subgroup's mid-angle to the point where the ribbon meets the
 * inner circle. d3's chord angles start at 12 o'clock and increase clockwise —
 * the same convention `d3.arc` uses — so x is sin and y is negative cos.
 */
const ribbonAnchor = (
  subgroup: { startAngle: number; endAngle: number },
  radius: number,
) => {
  const angle = (subgroup.startAngle + subgroup.endAngle) / 2;
  return { x: radius * Math.sin(angle), y: -radius * Math.cos(angle) };
};

function ChordChartContent({
  data,
  keys,
  width,
  height,
  className,
  colorScheme = ['#a855f7', '#ec4899', '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444'],
  emptyMessage = 'No data to display',
}: ChordChartContentProps) {
  const outerRadius = Math.min(width, height) * 0.5 - 40;
  const innerRadius = outerRadius - 20;

  const [activeArc, setActiveArc] = useState<number | null>(null);

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

  // Gradient ids must be unique per mounted chart: two Chords on one page would
  // otherwise both define `chord-gradient-0`, and every reference in the
  // document resolves to whichever definition the browser saw first. useId
  // embeds ':' delimiters, which querySelector and CSS selectors reject, so
  // they are stripped — the instance counter inside carries the uniqueness.
  const gradientPrefix = `chord-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

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
      <svg ref={setRefs} width={width} height={height} className="overflow-visible">
        <Group top={height / 2} left={width / 2}>
          <Chord matrix={matrix} padAngle={0.05} sortSubgroups={(a, b) => b - a}>
            {({ chords }) => (
              <g>
                {/* One gradient per ribbon, fading the source group's colour
                    into the target's so a flow reads as leaving one arc and
                    arriving at another.

                    userSpaceOnUse anchors the gradient to the ribbon's own two
                    attachment points. The default (objectBoundingBox) would
                    measure the ribbon's bounding box, which is axis-aligned and
                    so points the fade along the wrong diagonal for every chord
                    that is not horizontal or vertical.

                    These <defs> sit inside the translated <Group>, so the
                    coordinates are the same centre-origin space the ribbons are
                    drawn in — userSpaceOnUse resolves against the referencing
                    element's user space, not the root svg's. */}
                <defs>
                  {chords.map((chord, i) => {
                    const from = ribbonAnchor(chord.source, innerRadius);
                    const to = ribbonAnchor(chord.target, innerRadius);
                    return (
                      <linearGradient
                        key={`ribbon-gradient-${i}`}
                        id={`${gradientPrefix}-${i}`}
                        gradientUnits="userSpaceOnUse"
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                      >
                        <stop offset="0%" stopColor={colorScale(keys[chord.source.index])} />
                        <stop offset="100%" stopColor={colorScale(keys[chord.target.index])} />
                      </linearGradient>
                    );
                  })}
                </defs>

                {/* Ribbons */}
                {chords.groups.map((group, i) => (
                  <Arc
                    key={`arc-${i}`}
                    data={group}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    fill={colorScale(keys[i])}
                    className="transition-opacity duration-200 cursor-pointer"
                    opacity={activeArc === null || activeArc === i ? 1 : 0.3}
                    onMouseEnter={() => setActiveArc(i)}
                    onMouseLeave={() => setActiveArc(null)}
                  />
                ))}

                {chords.map((chord, i) => (
                  <Ribbon
                    key={`ribbon-${i}`}
                    chord={chord}
                    radius={innerRadius}
                    fill={`url(#${gradientPrefix}-${i})`}
                    fillOpacity={0.75}
                    className="transition-all duration-200 hover:fill-opacity-100 mix-blend-multiply dark:mix-blend-screen"
                    opacity={
                      activeArc === null ||
                        activeArc === chord.source.index ||
                        activeArc === chord.target.index ? 0.75 : 0.1
                    }
                    onMouseEnter={(event) => {
                      const rect = svgRef.current?.getBoundingClientRect();
                      if (!rect) return;

                      showTooltip({
                        tooltipData: {
                          label: `${keys[chord.source.index]} ↔ ${keys[chord.target.index]}`,
                          value: chord.source.value
                        },
                        tooltipLeft: event.clientX - rect.left,
                        tooltipTop: event.clientY - rect.top,
                      });
                    }}
                    onMouseLeave={() => hideTooltip()}
                  />
                ))}
              </g>
            )}
          </Chord>
        </Group>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent' }}
        >
          <div className="rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
            <span className="font-semibold block">{tooltipData.label}</span>
            <span className="text-xs text-muted-foreground">Flow: {tooltipData.value}</span>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export const ChordChart = (props: ChordChartProps) => {
  return (
    <div className="w-full h-[400px]">
      <ParentSize>
        {({ width, height }) => <ChordChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  );
}
