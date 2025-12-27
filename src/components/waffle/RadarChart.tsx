import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { Point } from '@visx/point';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { useMemo } from 'react';

export type RadarChartProps<T> = {
  data: T[];
  radiusKey: keyof T;
  angleKey: keyof T;
  className?: string;
  gridColor?: string;
  polygonColor?: string;
  color?: string; // Direct color value (hex, rgb) - applies to polygon fill/stroke
  width?: number;
  height?: number;
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
  polygonColor = "#a855f7",
  color,
}: RadarChartContentProps<T>) {
  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;
  const radius = Math.min(xMax, yMax) / 2;

  const getRadius = (d: T) => Number(d[radiusKey]);
  const getAngle = (d: T) => d[angleKey] as string;

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [0, radius],
        domain: [0, Math.max(...data.map(getRadius)) * 1.1],
      }),
    [radius, data, radiusKey]
  );

  const angleStep = (Math.PI * 2) / data.length;

  // Generate grid points
  // 5 concentric circles
  const gridLevels = [1, 2, 3, 4, 5];
  const gridPoints = gridLevels.map((level) => {
    const r = (radius / 5) * level;
    return data.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return new Point({
        x: r * Math.cos(angle),
        y: r * Math.sin(angle),
      });
    });
  });

  // Calculate polygon points
  const points = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = yScale(getRadius(d));
    return new Point({
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
    });
  });

  if (width < 10) return null;

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
          {data.map((_, i) => {
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
          {data.map((d, i) => {
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
          {(() => {
            const isHex = !color && (polygonColor.startsWith('#') || polygonColor.startsWith('rgb'));
            return (
              <polygon
                points={points.map(p => `${p.x},${p.y}`).join(' ')}
                fill={color ? `${color}33` : isHex ? `${polygonColor}33` : undefined}
                stroke={color || (isHex ? polygonColor : undefined)}
                strokeWidth={2}
                className={cn(!color && !isHex && "stroke-primary stroke-2 fill-primary/20", "hover:opacity-80 transition-opacity", !color && !isHex && polygonColor)}
              />
            );
          })()}

          {/* Dots on corners */}
          {points.map((p, i) => (
            <circle
              key={`point-${i}`}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={color ? "white" : undefined}
              stroke={color}
              strokeWidth={color ? 2 : undefined}
              className={cn(!color && "fill-background stroke-primary stroke-2")}
            />
          ))}

        </Group>
      </svg>
    </div>
  );
}

export const RadarChart = <T,>(props: RadarChartProps<T>) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <RadarChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
