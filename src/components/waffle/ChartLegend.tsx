import { cn } from "../../lib/utils";

export type ChartLegendItem = {
  label: string;
  color: string;
};

export type ChartLegendProps = {
  payload: ChartLegendItem[];
  orientation?: "horizontal" | "vertical";
  className?: string;
};

export function ChartLegend({
  payload,
  orientation = "horizontal",
  className,
}: ChartLegendProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-4 text-sm text-muted-foreground",
        orientation === "vertical" ? "flex-col" : "items-center justify-center",
        className
      )}
    >
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
