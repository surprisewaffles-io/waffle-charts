import { cn } from "../../lib/utils";

export type ChartLegendItem = {
  label: string;
  color: string;
};

export type ChartLegendProps = {
  payload: ChartLegendItem[];
  orientation?: "horizontal" | "vertical";
  className?: string;
  /** Accessible name for the legend as a whole. Defaults to "Chart legend". */
  ariaLabel?: string;
  /** Id of a visible heading that names the legend. Takes precedence over `ariaLabel`. */
  ariaLabelledby?: string;
};

/**
 * Why: a legend is the key that makes a chart's colours mean anything. Rendered
 * as anonymous `<div>`s it reaches a screen reader as a run of loose text with
 * no boundary between entries, and the colour swatch reads as nothing at all.
 *
 * What: renders the entries as a real list, so a reader announces "list, 3
 * items" and can step through them, and names the list as a whole. The swatch
 * is `aria-hidden` because colour is decoration here — the adjacent label
 * already carries the meaning, which is what WCAG 1.4.1 requires.
 *
 * A legend is not interactive, so it takes no `tabIndex` and no arrow-key
 * handler: list semantics already give a reader a way through it, and putting
 * non-interactive items in the tab order would fail WCAG 2.4.3 rather than help.
 *
 * Test: `src/components/waffle/__tests__/ChartLegend.test.tsx`
 */
export function ChartLegend({
  payload,
  orientation = "horizontal",
  className,
  ariaLabel,
  ariaLabelledby,
}: ChartLegendProps) {
  // A legend with nothing to list renders as an empty row rather than a
  // fallback message; `payload.map` would throw on null or undefined.
  const items = Array.isArray(payload) ? payload : [];

  return (
    <ul
      aria-labelledby={ariaLabelledby}
      aria-label={ariaLabelledby ? undefined : ariaLabel ?? "Chart legend"}
      className={cn(
        "flex flex-wrap gap-4 text-sm text-muted-foreground",
        orientation === "vertical" ? "flex-col" : "items-center justify-center",
        className
      )}
    >
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
