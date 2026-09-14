# Migration Guide

## Upgrading to v0.2.0

### Breaking Changes

**None** — All changes are backwards compatible. Existing code continues to work without modifications.

### New Features

#### Accessibility (WCAG 2.1 Level AA)

All charts now support accessibility props for keyboard navigation and screen reader support:

```tsx
<BarChart 
  data={salesData}
  xKey="month"
  yKey="revenue"
  ariaLabel="Monthly sales revenue"
  title="2024 Sales Performance"
  description="Bar chart showing monthly sales from January to December, ranging from $2M to $5M"
  keyboardNavigable={true}
/>
```

**Accessibility props** (all optional):

- `ariaLabel` — Accessible name for the chart
- `ariaDescribedby` — Reference to description element
- `title` — Chart title (shown in `<title>` element)
- `description` — Detailed description for screen readers
- `keyboardNavigable` — Enable keyboard navigation (default: `true`)

**Keyboard shortcuts** available in all charts:

- `Tab` / `Shift+Tab` — Focus chart and navigate focus
- `Arrow keys` — Navigate between data points
- `Home` / `End` — Jump to first/last data point
- `Enter` / `Space` — Activate focused data point
- `Escape` — Clear selection

**Focus ring customization:**

```css
/* Light theme */
:root {
  --waffle-focus-color: #0066cc;  /* 5.57:1 contrast on white */
}

/* Dark theme */
.dark {
  --waffle-focus-color: #64b5ff;  /* 9.07:1 contrast on dark */
}
```

#### Performance Optimization

Charts are automatically memoized with `React.memo`. For best performance, keep callbacks stable:

```tsx
// ✅ Do: Memoize callbacks for stable reference
const handleClick = useCallback((dataPoint: DataPoint) => {
  setSelected(dataPoint);
}, []);

<BarChart 
  data={data} 
  xKey="label" 
  yKey="value" 
  onClick={handleClick} 
/>

// ❌ Don't: Inline callbacks create new functions every render
<BarChart 
  data={data} 
  xKey="label" 
  yKey="value" 
  onClick={(d) => setSelected(d)} 
/>
```

**How memoization works:**

- Data arrays compared structurally, so inline literals like `[{ x: 1, y: 2 }]` skip rerenders when values unchanged
- Function props compared by reference — must be stable via `useCallback`
- Objects, Dates, Maps, and deep nesting (>8 levels) compared by reference
- Parent re-renders no longer trigger chart layout recalculation when props unchanged

**Example: Dashboard with multiple charts**

```tsx
function Dashboard() {
  const [tab, setTab] = useState('sales');
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  // Stable callback prevents chart rerenders
  const handleSelect = useCallback((point) => {
    setSelectedPoint(point);
  }, []);
  
  return (
    <>
      <Tabs value={tab} onChange={setTab} />
      {/* Tab changes re-render Dashboard but NOT the chart */}
      <BarChart 
        data={stableData} 
        xKey="label" 
        yKey="value"
        onClick={handleSelect}
      />
    </>
  );
}
```

#### CLI Enhancements

**Enhanced registry with metadata:**

```bash
# View all available charts with metadata
npx waffle-charts-cli list

# Add a chart with intelligent defaults
npx waffle-charts-cli add bar-chart
```

**Chart selector helper** for programmatic chart selection:

```typescript
import { recommend } from 'waffle-charts-cli/selector';

const recommendations = recommend({
  relationship: 'comparison',  // or 'distribution', 'composition', 'trend', 'correlation'
  dataPoints: 8,
  structure: 'flat',          // or 'hierarchical', 'network', 'geographical'
  interactive: true
});

// Returns: ['bar-chart', 'line-chart', 'radar-chart']
```

**Security improvements:**

- Path validation with symlink resolution prevents directory traversal
- Safe dependency installation with `--ignore-scripts` flag
- File overwrites require confirmation (use `--force` to skip in automation)

```bash
# Interactive mode - prompts before overwriting
npx waffle-charts-cli add bar-chart --path ./components/charts/

# Automation mode - force overwrite without prompt
npx waffle-charts-cli add bar-chart --force
```

#### Empty Data Handling

All charts now gracefully handle empty, `null`, or `undefined` data:

```tsx
// Previously: would crash
// Now: renders customizable fallback message
<BarChart 
  data={[]} 
  xKey="label" 
  yKey="value"
  emptyMessage="No data available"
/>
```

**Default message:** `"No data available"`

**Affected charts:** All 16 charts now handle empty data safely.

### Security Improvements

#### Dependency Vulnerabilities

All 20 dependency vulnerabilities resolved:
- 1 critical → 0
- 14 high → 0  
- 4 moderate → 0
- 1 low → 0

**Action:** Update to latest version to eliminate all known vulnerabilities.

```bash
npm install waffle-charts@latest
npm audit  # Should show 0 vulnerabilities
```

#### CLI Security

Three CLI security issues fixed:

1. **Path traversal** — Symlink-based directory escapes now prevented
2. **Command injection** — Shell interpolation eliminated from dependency installs
3. **Silent overwrites** — User confirmation required before file replacement

**Action:** Update CLI to latest version.

```bash
npx waffle-charts-cli@latest --version
```

### Testing Your Charts

If you test charts with Testing Library, configure it to ignore accessibility elements:

```typescript
import { configure } from '@testing-library/react';

configure({
  defaultIgnore: 
    'script, style, [data-chart-a11y-table], [data-chart-a11y-table] *, [data-chart-a11y-text]',
});
```

This prevents duplicate matches when using `getByText()` — charts render data twice (once as shapes, once as accessible table).

**Role queries still work:** `getByRole('table')`, `getByRole('cell')` still find the accessibility table.

### Recommended Actions

1. **Update dependencies** to eliminate vulnerabilities:
   ```bash
   npm install waffle-charts@latest
   npm audit
   ```

2. **Add accessibility props** for improved UX:
   ```tsx
   <BarChart 
     data={data}
     xKey="x"
     yKey="y"
     ariaLabel="Descriptive chart name"
     title="Chart Title"
   />
   ```

3. **Memoize callbacks** for optimal performance:
   ```tsx
   const handleClick = useCallback((d) => { ... }, [deps]);
   ```

4. **Handle empty data** explicitly if needed:
   ```tsx
   <BarChart 
     data={data} 
     emptyMessage="No sales data for this period"
   />
   ```

5. **Update CLI usage** to leverage new security features:
   ```bash
   # Use --force in CI/CD pipelines
   npx waffle-charts-cli add chart-name --force
   ```

### No Migration Required

All changes are additive and backwards compatible. Existing implementations continue to work without code changes. The improvements are available as opt-in enhancements.
