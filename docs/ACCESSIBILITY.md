# Accessibility Guide

## WCAG 2.1 Level AA Compliance

All WaffleCharts components meet **WCAG 2.1 Level AA** accessibility standards, ensuring charts are perceivable, operable, understandable, and robust for all users.

## Features

### Keyboard Navigation

Every chart supports full keyboard interaction:

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Focus chart / navigate focus |
| `Arrow keys` (`←` `→` `↑` `↓`) | Navigate between data points |
| `Home` | Jump to first data point |
| `End` | Jump to last data point |
| `Enter` or `Space` | Activate/select focused data point |
| `Escape` | Clear selection |

**Navigation wraps:** Arrow keys wrap around from last to first data point and vice versa.

**Chart-specific navigation:**
- **Bar/Line/Area charts:** Left/Right arrows move between points
- **Pie/Radial charts:** Arrow keys move clockwise/counterclockwise
- **Heatmap:** Arrow keys navigate grid cells
- **TreeMap/Sankey:** Arrow keys navigate hierarchical structure

### Screen Reader Support

Charts provide comprehensive information to assistive technology:

**Semantic structure:**
- `role="img"` on SVG container (per ARIA Graphics guidelines)
- `<title>` element with chart name
- `<desc>` element with detailed description
- `aria-label` with concise chart summary

**Off-screen data table:**
- Full data accessible via `<table>` element
- Hidden visually but available to screen readers
- Referenced via `aria-details` attribute
- One row per data point with all values

**Live announcements:**
- `aria-live="polite"` region announces focused data point
- Updates as user navigates with keyboard
- Non-intrusive (polite) announcements

### Focus Indicators

Visible focus indicators meet **WCAG 2.4.7** (Focus Visible - Level AA):

**Chart focus:**
- 2px solid outline on chart container when focused
- Color defined by CSS custom property `--waffle-focus-color`

**Data point focus:**
- Outline on focused bar, line point, pie segment, etc.
- Same color as chart focus for consistency

**Contrast ratios:**
- Light theme: `#0066cc` on white background (5.57:1 contrast)
- Dark theme: `#64b5ff` on dark background (9.07:1 contrast)

Both exceed WCAG 2.4.11 (Focus Appearance - Level AA) requirement of 3:1 minimum contrast.

## API Reference

### Accessibility Props

All chart components accept these optional props:

```typescript
interface AccessibilityProps {
  /** Accessible name for the chart (used in aria-label) */
  ariaLabel?: string;
  
  /** ID of element that describes the chart */
  ariaDescribedby?: string;
  
  /** Chart title (shown in <title> element) */
  title?: string;
  
  /** Detailed description for screen readers */
  description?: string;
  
  /** Enable keyboard navigation (default: true) */
  keyboardNavigable?: boolean;
}
```

### Default Behavior

When accessibility props are omitted, charts generate sensible defaults:

**`ariaLabel`:** Generated from data
- Example: `"Bar chart with 12 data points"`

**`title`:** Chart type
- Example: `"Bar Chart"`

**`description`:** Statistical summary
- Example: `"Bar chart with 12 bars. Range: 100 to 300. Average: 196.7."`

**`keyboardNavigable`:** `true` (always enabled by default)

### Usage Examples

#### Basic Usage

```tsx
<BarChart
  data={salesData}
  xKey="month"
  yKey="revenue"
/>
```

Generates automatic accessibility features with sensible defaults.

#### Enhanced Accessibility

```tsx
<BarChart
  data={salesData}
  xKey="month"
  yKey="revenue"
  ariaLabel="Monthly sales revenue for 2024"
  title="2024 Sales Performance"
  description="Bar chart showing monthly sales from January to December, ranging from $2M to $5M. Peak sales in December at $5M."
/>
```

Provides rich context for screen reader users.

#### Financial Chart

```tsx
<CandlestickChart
  data={stockData}
  ariaLabel="Apple stock price, daily data for March 2024"
  title="AAPL Daily Price Chart"
  description="Candlestick chart showing daily open, high, low, and close prices for Apple stock. Price range: $165 to $182. Trend: upward."
/>
```

#### Hierarchical Chart

```tsx
<TreemapChart
  data={categoryData}
  ariaLabel="Product sales by category and subcategory"
  title="Product Category Breakdown"
  description="Treemap showing hierarchical product sales. Top category: Electronics at $2.5M. Largest subcategory: Laptops at $1.2M."
/>
```

## Customization

### Focus Ring Color

Customize the focus ring color to match your brand while maintaining WCAG contrast requirements:

```css
/* Light theme */
:root {
  --waffle-focus-color: #0066cc;  /* Default: blue */
}

/* Dark theme */
.dark {
  --waffle-focus-color: #64b5ff;  /* Default: light blue */
}

/* Brand-specific */
:root {
  --waffle-focus-color: #7c3aed;  /* Purple - ensure 3:1 contrast */
}
```

**Requirement:** Focus color must have at least 3:1 contrast ratio against the background (WCAG 2.4.11).

**Testing contrast:**
- Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Test against both light and dark backgrounds
- Test in both light and dark modes

### Custom Empty Message

```tsx
<BarChart
  data={[]}
  xKey="x"
  yKey="y"
  emptyMessage="No data available for the selected time period"
/>
```

## Testing

### Manual Testing

**Keyboard navigation:**
1. Tab to the chart
2. Verify focus indicator visible
3. Use arrow keys to navigate data points
4. Verify each point is visually highlighted
5. Press Enter/Space to select
6. Press Escape to clear selection

**Screen reader testing:**
1. Enable screen reader (NVDA, JAWS, VoiceOver)
2. Tab to chart
3. Verify chart title and description announced
4. Navigate with arrow keys
5. Verify data point values announced
6. Tab away and verify data table is reachable

### Automated Testing

**Configure Testing Library** to ignore accessibility elements:

```typescript
import { configure } from '@testing-library/react';

configure({
  defaultIgnore: 
    'script, style, [data-chart-a11y-table], [data-chart-a11y-table] *, [data-chart-a11y-text]',
});
```

**Why:** Charts render data twice:
1. Visual representation (SVG shapes)
2. Accessibility table (off-screen `<table>`)

Without this configuration, `getByText('100')` matches both and throws an error.

**Role queries still work:**

```typescript
// ✅ Find the accessibility table
const table = getByRole('table');

// ✅ Find cells in the table
const cells = getAllByRole('cell');

// ✅ Find chart by accessible name
const chart = getByRole('img', { name: /sales chart/i });
```

### Testing Tools

**Screen readers tested:**
- **NVDA** (Windows) - Free, most common
- **JAWS** (Windows) - Widely used in enterprise
- **VoiceOver** (macOS/iOS) - Built-in Apple screen reader

**Browser testing:**
- Chromium 153+ (Chrome, Edge, Brave)
- Firefox 115+
- Safari 17+

**Accessibility auditing:**
- [axe DevTools](https://www.deque.com/axe/devtools/) browser extension
- [Lighthouse](https://developer.chrome.com/docs/lighthouse) (built into Chrome DevTools)
- [WAVE](https://wave.webaim.org/) browser extension

## Best Practices

### Writing Descriptions

**Good descriptions:**
- State the chart type
- Mention the data range
- Note any trends or patterns
- Keep it concise (1-2 sentences)

```tsx
description="Line chart showing temperature trends from Jan to Dec. 
  Range: 32°F to 95°F. Peaks in July-August, lows in December-January."
```

**Avoid:**
- Reading every data point (use the table for that)
- Vague summaries like "This chart shows data"
- Technical jargon without explanation

### Choosing Accessible Colors

All WaffleCharts use accessible color palettes by default, but when customizing:

**Color contrast:**
- Text on background: 4.5:1 minimum (WCAG AA)
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

**Don't rely on color alone:**
- Use patterns, shapes, or labels
- Example: Add data labels to bars, not just colors

**Colorblind-friendly:**
- Avoid red/green combinations
- Test with colorblind simulators
- Use the default palette (designed for accessibility)

### Chart Legend Accessibility

`ChartLegend` component is accessible by default:

```tsx
<ChartLegend
  items={[
    { label: 'Revenue', color: '#8b5cf6' },
    { label: 'Profit', color: '#ec4899' },
  ]}
  ariaLabel="Chart legend"
/>
```

**Features:**
- Renders as semantic `<ul>` list
- Each item has `role="listitem"`
- Color indicators have `aria-hidden="true"` (redundant with label)
- No `tabindex` (non-interactive, per WCAG 2.4.3)

## Standards Compliance

### WCAG 2.1 Level AA Criteria Met

| Criterion | Level | Requirement | How WaffleCharts Complies |
|-----------|-------|-------------|---------------------------|
| 1.1.1 Non-text Content | A | Text alternatives for non-text content | `aria-label`, `<title>`, `<desc>`, data table |
| 1.3.1 Info and Relationships | A | Semantic structure | `role="img"`, semantic table, proper ARIA |
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 for text, 3:1 for UI | Default palette meets all ratios |
| 1.4.11 Non-text Contrast | AA | 3:1 for UI components | Focus ring 5.57:1 (light), 9.07:1 (dark) |
| 2.1.1 Keyboard | A | All functionality via keyboard | Full keyboard navigation implemented |
| 2.1.2 No Keyboard Trap | A | Keyboard users can navigate away | Tab/Shift+Tab work normally |
| 2.4.3 Focus Order | A | Logical focus order | Chart in document flow, data points in order |
| 2.4.7 Focus Visible | AA | Visible focus indicator | 2px outline with high contrast |
| 4.1.2 Name, Role, Value | A | UI components have accessible name/role | All interactive elements properly labeled |
| 4.1.3 Status Messages | AA | Status changes announced | Live region announces focused data point |

### ARIA Patterns Followed

- [Graphics ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/graphics-doc-structure/) - Image role for data visualizations
- [ARIA Live Regions](https://www.w3.org/WAI/ARIA/apg/practices/live-regions/) - Polite announcements for navigation

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)
- [axe Accessibility Testing](https://www.deque.com/axe/)
- [WaffleCharts GitHub Issues](https://github.com/surprisewaffles-io/waffle-charts/issues) - Report accessibility issues

## Reporting Issues

Found an accessibility issue? Please report it:

1. [Open a GitHub issue](https://github.com/surprisewaffles-io/waffle-charts/issues/new)
2. Label it with `accessibility`
3. Include:
   - Chart component name
   - Browser and screen reader (if applicable)
   - Steps to reproduce
   - Expected vs. actual behavior

We prioritize accessibility issues and aim to respond within 48 hours.
