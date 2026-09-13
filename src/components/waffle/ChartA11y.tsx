/**
 * Why: the markup half of the shared accessibility layer. It lives apart from
 * `src/lib/chart-a11y.ts` because Fast Refresh only tracks a module that
 * exports components and nothing else, and that module exports the hook.
 *
 * What: the two pieces every chart renders around its drawing code — the
 * `<title>`/`<desc>` pair inside the SVG, and the live region plus table
 * alternative beside it.
 *
 * Test: `src/lib/__tests__/chart-a11y.test.tsx`
 */
import type { ChartA11y } from '../../lib/chart-a11y';

/**
 * The `<title>` and `<desc>` pair, which must be the SVG's first children for
 * assistive tech to treat them as its name and description.
 */
export function ChartSvgDescription({
  titleId,
  descId,
  title,
  description,
}: {
  titleId: string;
  descId: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <title id={titleId} data-chart-a11y-text="true">
        {title}
      </title>
      <desc id={descId} data-chart-a11y-text="true">
        {description}
      </desc>
    </>
  );
}

/** Rows past this point are omitted from the table alternative. */
const MAX_TABLE_ROWS = 200;

export type ChartA11yLayerProps = {
  a11y: ChartA11y;
  /** Column headers for the table alternative. */
  columns: readonly string[];
  /** One array of cells per data point, in the same order the chart drew them. */
  rows: readonly (readonly (string | number)[])[];
};

/**
 * Why: `role="img"` on the SVG hides every shape inside it, so per-datum
 * information needs a route that does not pass through the SVG. Two routes
 * exist here — a polite live region for the keyboard cursor, and a real table
 * the reader can navigate with table commands.
 *
 * What: renders both off-screen, next to the SVG rather than inside it.
 * `sr-only` keeps them out of the visual layout while leaving them in the
 * accessibility tree, which `display: none` would not.
 *
 * Test: `exposes a data table alternative`, `announces the focused point`
 */
export function ChartA11yLayer({ a11y, columns, rows }: ChartA11yLayerProps) {
  const visibleRows = rows.slice(0, MAX_TABLE_ROWS);
  const omitted = rows.length - visibleRows.length;

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {a11y.liveMessage}
      </div>
      <table id={a11y.tableId} data-chart-a11y-table="true" className="sr-only">
        <caption>
          {a11y.resolvedTitle}
          {omitted > 0 ? ` (first ${visibleRows.length} of ${rows.length} rows)` : ''}
        </caption>
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, rowIndex) => (
            <tr key={rowIndex} aria-current={a11y.focusedIndex === rowIndex ? 'true' : undefined}>
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th key={cellIndex} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={cellIndex}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
