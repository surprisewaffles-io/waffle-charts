import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { Point } from '@visx/point';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { useCallback, useMemo } from 'react';

export type RadarChartProps<T> = {
  data: T[];
  radiusKey: keyof T;
  angleKey: keyof T;
  className?: string;
  gridColor?: string;
  polygonColor?: string;
  width?: number;
  height?: number;
  /** Rendered in place of the chart when `data` holds no plottable rows. */
  emptyMessage?: string;
};

type RadarChartContentProps<T> = RadarChartProps<T> & {
  width: number;
  height: number;
};

function RadarChartContent<T>({
  data,
  width,
  height,
  radiusKey,
  angleKey,
  className,
  gridColor = "stroke-border",
  polygonColor = "fill-primary",
  emptyMessage = 'No data to display',
}: RadarChartContentProps<T>) {
  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;
  const radius = Math.min(xMax, yMax) / 2;

  // Every hook below runs unconditionally. `data` is normalised to an array
  // here rather than guarded with an early return, because an early return
  // placed above these hooks changes the hook count between renders.
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Memoised so the yScale memo below actually caches — a fresh closure each
  // render would invalidate it on every pass.
  const getRadius = useCallback((d: T) => Number(d[radiusKey]), [radiusKey]);
  const getAngle = (d: T) => d[angleKey] as string;

  // A spoke without a finite radius cannot be placed on the web.
  const validData = useMemo(
    () => safeData.filter(d => Number.isFinite(getRadius(d))),
    [safeData, getRadius],
  );

  const yScale = useMemo(() => {
    // Math.max spread over an empty array yields -Infinity, which is truthy —
    // a `|| 0` fallback never fires and the domain becomes unusable.
    const peak = validData.length ? Math.max(...validData.map(getRadius)) : 0;
    return scaleLinear<number>({
      range: [0, radius],
      domain: [0, peak > 0 ? peak * 1.1 : 1],
    });
  }, [radius, validData, getRadius]);

  // Dividing by an empty length would make every angle Infinity.
  const angleStep = validData.length ? (Math.PI * 2) / validData.length : 0;

  // Generate grid points
  // 5 concentric circles
  const gridLevels = [1, 2, 3, 4, 5];
  const gridPoints = gridLevels.map((level) => {
    const r = (radius / 5) * level;
    return validData.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return new Point({
        x: r * Math.cos(angle),
        y: r * Math.sin(angle),
      });
    });
  });

  // Calculate polygon points
  const points = validData.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = yScale(getRadius(d));
    return new Point({
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
    });
  });

  if (width < 10) return null;

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
      <svg width={width} height={height} className="overflow-visible">
        <Group top={height / 2} left={width / 2}>
          {/* Grid Rings (Polygonal) */}
          {gridPoints.map((levelPoints, i) => (
            <polygon
              key={`grid-level-${i}`}
              points={levelPoints.map(p => `${p.x},${p.y}`).join(' ')}
              fill="transparent"
              stroke="currentColor"
              className={cn("stroke-1 opacity-20", gridColor)}
            />
          ))}

          {/* Axes */}
          {validData.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = radius;
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            return (
              <line
                key={`axis-${i}`}
                x1={0}
                y1={0}
                x2={x}
                y2={y}
                className={cn("stroke-1 opacity-20", gridColor)}
              />
            );
          })}

          {/* Labels */}
          {validData.map((d, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = radius + 20; // Offset label
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            return (
              <text
                key={`label-${i}`}
                x={x}
                y={y}
                dy="0.35em"
                textAnchor={x > 0 ? 'start' : x < 0 ? 'end' : 'middle'}
                className="text-xs fill-muted-foreground capit"
              >
                {getAngle(d)}
              </text>
            );
          })}

          {/* The Radar Polygon */}
          <polygon
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            className={cn("stroke-primary stroke-2 fill-primary/20 hover:opacity-80 transition-opacity", polygonColor)}
          />

          {/* Dots on corners */}
          {points.map((p, i) => (
            <circle
              key={`point-${i}`}
              cx={p.x}
              cy={p.y}
              r={4}
              className="fill-background stroke-primary stroke-2"
            />
          ))}

        </Group>
      </svg>
    </div>
  );
}

export const RadarChart = <T,>(props: RadarChartProps<T>) => {
  return (
    <div className="w-full h-[300px]">
      <ParentSize>
        {({ width, height }) => <RadarChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
