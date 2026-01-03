import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleOrdinal } from '@visx/scale';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { cn } from '../../lib/utils';
import { useMemo } from 'react';

export type WaffleChartProps<T> = {
  data: T[];
  labelKey: keyof T;
  valueKey: keyof T;
  total?: number; // Optional total, otherwise sum of values
  rows?: number;
  columns?: number;
  width?: number;
  height?: number;
  gap?: number;
  rounding?: number;
  className?: string;
  colors?: string[];
  testId?: string;
};

type WaffleChartContentProps<T> = WaffleChartProps<T> & {
  width: number;
  height: number;
};

// Helper to generate grid cells
// Returns array of { r, c, index, dataIndex, ... }
// We map data to cells.
// Example: Data A=30, B=20, Total=100. Grid 10x10=100 cells.
// Cells 0-29 -> A. Cells 30-49 -> B. Cells 50-99 -> Empty/Grey.

function WaffleChartContent<T>({
  data,
  width,
  height,
  labelKey,
  valueKey,
  total,
  rows = 10,
  columns = 10,
  gap = 2,
  rounding = 2,
  className,
  colors,
  testId = 'waffle-chart',
}: WaffleChartContentProps<T>) {
  const margin = { top: 0, right: 0, bottom: 0, left: 0 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Accessors
  const getLabel = (d: T) => String(d[labelKey]);
  const getValue = (d: T) => Number(d[valueKey]);

  // Color Scale
  const defaultColors = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  const colorScale = scaleOrdinal({
    domain: data.map((_, i) => i),
    range: colors || defaultColors,
  });

  // Cell Calculation
  const totalCells = rows * columns;
  const dataTotal = useMemo(() => data.reduce((sum, d) => sum + getValue(d), 0), [data, valueKey]);
  const effectiveTotal = total || dataTotal;

  // Generate Cells
  // We need to assign each cell to a data segment.
  const cells = useMemo(() => {
    const grid = [];

    // Let's create a flat array of 'types'
    const flatMap: { type: 'data' | 'empty', d?: T, index?: number }[] = [];

    data.forEach((d, i) => {
      const val = getValue(d);
      // Proportion of grid
      const count = Math.round((val / effectiveTotal) * totalCells);
      for (let k = 0; k < count; k++) {
        if (flatMap.length < totalCells) {
          flatMap.push({ type: 'data', d, index: i });
        }
      }
    });

    // Fill remaining with empty
    while (flatMap.length < totalCells) {
      flatMap.push({ type: 'empty' });
    }

    // Now map map to grid coords
    // Default filling: Row by Row default? Or user specified?
    // Let's fill Row by Row (Top Left to Bottom Right)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const i = r * columns + c;
        const cellData = flatMap[i];
        grid.push({
          r,
          c,
          i,
          ...cellData
        });
      }
    }

    return grid;
  }, [data, rows, columns, effectiveTotal, totalCells, valueKey]);

  // Layout
  // fit grid into width/height.
  const cellWidth = (innerWidth - (gap * (columns - 1))) / columns;
  const cellHeight = (innerHeight - (gap * (rows - 1))) / rows;

  // Tooltip
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<{ d: T, index: number }>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
    detectBounds: true
  });

  if (width < 10) return null;

  return (
    <div className={cn("relative", className)} data-testid={testId}>
      <svg ref={containerRef} width={width} height={height} className="overflow-hidden rounded-md">
        <Group left={margin.left} top={margin.top}>
          {cells.map((cell) => {
            const x = cell.c * (cellWidth + gap);
            const y = cell.r * (cellHeight + gap);

            return (
              <rect
                key={`cell-${cell.i}`}
                x={x}
                y={y}
                width={Math.max(0, cellWidth)}
                height={Math.max(0, cellHeight)}
                rx={rounding}
                ry={rounding}
                fill={cell.type === 'data' && cell.index !== undefined
                  ? colorScale(cell.index)
                  : 'hsl(var(--muted))'
                }
                className={cn(
                  "transition-all duration-200",
                  cell.type === 'data' ? "hover:opacity-80 cursor-pointer" : "opacity-20"
                )}
                onMouseEnter={() => {
                  if (cell.type === 'data' && cell.d && cell.index !== undefined) {
                    showTooltip({
                      tooltipData: { d: cell.d, index: cell.index },
                      tooltipLeft: x + cellWidth / 2,
                      tooltipTop: y
                    })
                  }
                }}
                onMouseLeave={hideTooltip}
              />
            )
          })}
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', transform: 'translate(-50%, -100%)', marginTop: '-8px', zIndex: 100 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl text-center">
            <div className="font-semibold flex items-center gap-2 justify-center">
              <div className="w-2 h-2 rounded-full" style={{ background: colorScale(tooltipData.index) }} />
              {getLabel(tooltipData.d)}
            </div>
            <div className="text-muted-foreground">{getValue(tooltipData.d)} ({Math.round(getValue(tooltipData.d) / effectiveTotal * 100)}%)</div>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export function WaffleChart<T>(props: WaffleChartProps<T>) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 200 }}>
      <ParentSize>
        {({ width, height }) => <WaffleChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  );
}
