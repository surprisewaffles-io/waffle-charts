import { Chord, Ribbon } from '@visx/chord';
import { scaleOrdinal } from '@visx/scale';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { Arc } from '@visx/shape';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { useMemo, useState, useRef } from 'react';
import { Group } from '@visx/group';
import { localPoint } from '@visx/event';

// Types
export type ChordChartProps = {
  data: number[][];
  keys: string[];
  width?: number;
  height?: number;
  className?: string;
  colorScheme?: string[];
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
}: ChordChartContentProps) {
  // Calculate radius adaptively based on available space
  const centerSize = Math.min(width, height);
  const padding = Math.min(40, centerSize * 0.2); // Dynamic padding that scales with size
  const outerRadius = Math.max(10, centerSize * 0.5 - padding);
  const innerRadius = Math.max(5, outerRadius - 20);

  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  const [activeRibbon, setActiveRibbon] = useState<number | null>(null);

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

  if (width < 50) return null;

  return (
    <div className={cn("relative font-sans", className)}>
      <svg ref={setRefs} width={width} height={height} className="overflow-visible">
        <Group top={height / 2} left={width / 2}>
          <Chord matrix={data} padAngle={0.05} sortSubgroups={(a, b) => b - a}>
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
                    className="transition-opacity duration-200 cursor-pointer"
                    opacity={
                      (activeGroup !== null && activeGroup !== i) ||
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
                      (activeGroup !== null &&
                        activeGroup !== chord.source.index &&
                        activeGroup !== chord.target.index) ||
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

export const ChordChart = (props: ChordChartProps) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <ChordChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  );
}
