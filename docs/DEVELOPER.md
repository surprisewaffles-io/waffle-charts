# Developer Guide

## Component Metadata

WaffleCharts provides runtime metadata for all chart components, enabling dynamic chart selection, validation, and documentation generation.

### Runtime Metadata Access

```typescript
import { getComponentMeta } from 'waffle-charts/metadata';

const meta = getComponentMeta('BarChart');

console.log(meta);
// {
//   name: 'BarChart',
//   displayName: 'Bar Chart',
//   category: 'statistical',
//   description: 'Displays categorical data with rectangular bars',
//   capabilities: ['interactive', 'categorical', 'comparative'],
//   dataRequirements: {
//     minPoints: 1,
//     maxPoints: 100,
//     shape: 'flat',
//     requiredFields: ['x', 'y']
//   },
//   useCases: [
//     'Comparing values across categories',
//     'Showing rankings or distributions',
//     'Displaying time-series data with discrete intervals'
//   ],
//   example: '...'
// }
```

### Available Metadata Fields

```typescript
interface ComponentMetadata {
  /** Component name (e.g., 'BarChart') */
  name: string;
  
  /** Human-readable name (e.g., 'Bar Chart') */
  displayName: string;
  
  /** Category: 'statistical', 'relational', 'hierarchical', 'geospatial' */
  category: string;
  
  /** Brief description */
  description: string;
  
  /** Capabilities: 'interactive', 'categorical', 'temporal', etc. */
  capabilities: string[];
  
  /** Data requirements and constraints */
  dataRequirements: {
    minPoints: number;
    maxPoints: number;
    shape: 'flat' | 'hierarchical' | 'network' | 'geographical';
    requiredFields: string[];
  };
  
  /** Recommended use cases */
  useCases: string[];
  
  /** Code example */
  example: string;
}
```

### Data Shape Validation

Validate data against component requirements:

```typescript
import { validateDataShape } from 'waffle-charts/metadata';

const data = [
  { month: 'Jan', revenue: 1000 },
  { month: 'Feb', revenue: 1500 },
];

const result = validateDataShape('BarChart', data);

if (!result.valid) {
  console.error('Invalid data:', result.errors);
  // ['Missing required field: x', 'Data has 2 points, minimum is 3']
} else {
  console.log('Data is valid');
}
```

**Validation checks:**
- Required fields present
- Data point count within min/max range
- Data structure matches expected shape (flat vs. hierarchical)
- Data types are compatible

### Component Registry

Access the full registry of all available charts:

```typescript
import { getRegistry } from 'waffle-charts/metadata';

const registry = getRegistry();

// List all chart names
console.log(registry.map(meta => meta.name));
// ['AreaChart', 'BarChart', 'BubbleChart', ...]

// Filter by capability
const interactiveCharts = registry.filter(meta => 
  meta.capabilities.includes('interactive')
);

// Filter by category
const statisticalCharts = registry.filter(meta => 
  meta.category === 'statistical'
);

// Find charts for specific data size
const smallDataCharts = registry.filter(meta => 
  meta.dataRequirements.maxPoints >= 20
);
```

## Chart Selection Helper

The chart selector recommends appropriate charts based on your data characteristics and visualization goals.

### Basic Usage

```typescript
import { recommend } from 'waffle-charts-cli/selector';

const recommendations = recommend({
  relationship: 'comparison',
  dataPoints: 12,
  structure: 'flat',
  interactive: true,
});

console.log(recommendations);
// ['bar-chart', 'line-chart', 'radar-chart']
```

### Selection Criteria

```typescript
interface SelectionCriteria {
  /** Primary relationship being visualized */
  relationship: 
    | 'comparison'       // Compare values across categories
    | 'distribution'     // Show how data is distributed
    | 'composition'      // Show parts of a whole
    | 'trend'            // Show change over time
    | 'correlation'      // Show relationships between variables
    | 'hierarchy'        // Show parent-child relationships
    | 'flow'             // Show connections/transitions
    | 'location';        // Show geographic patterns
  
  /** Number of data points */
  dataPoints?: number;
  
  /** Data structure */
  structure?: 'flat' | 'hierarchical' | 'network' | 'geographical';
  
  /** Interactivity required */
  interactive?: boolean;
  
  /** Time dimension present */
  temporal?: boolean;
}
```

### Selection Algorithm

The selector uses a multi-axis scoring system:

1. **Relationship match** (40% weight)
   - Each chart has primary and secondary relationships
   - Primary match: +10 points
   - Secondary match: +5 points

2. **Data point count** (30% weight)
   - Within optimal range: +10 points
   - Within acceptable range: +5 points
   - Outside range: 0 points

3. **Capability match** (20% weight)
   - Each matching capability: +3 points
   - Interactive, temporal, hierarchical, etc.

4. **Structure match** (10% weight)
   - Exact match: +5 points
   - Compatible match: +3 points

**Results:** Charts sorted by total score, top 3 returned by default.

### Examples

#### Comparison visualization

```typescript
const charts = recommend({
  relationship: 'comparison',
  dataPoints: 8,
  structure: 'flat',
});
// → ['bar-chart', 'radar-chart', 'bubble-chart']
```

#### Time series trend

```typescript
const charts = recommend({
  relationship: 'trend',
  dataPoints: 50,
  temporal: true,
});
// → ['line-chart', 'area-chart', 'composite-chart']
```

#### Parts of a whole

```typescript
const charts = recommend({
  relationship: 'composition',
  dataPoints: 6,
});
// → ['pie-chart', 'waffle-chart', 'treemap-chart']
```

#### Hierarchical data

```typescript
const charts = recommend({
  relationship: 'hierarchy',
  structure: 'hierarchical',
  dataPoints: 100,
});
// → ['treemap-chart', 'sankey-chart']
```

#### Network/flow visualization

```typescript
const charts = recommend({
  relationship: 'flow',
  structure: 'network',
  dataPoints: 30,
});
// → ['sankey-chart', 'chord-chart']
```

## JSON Schema Validation

Generate and use JSON schemas for runtime prop validation.

### Runtime Prop Validation

```typescript
import { validateProps } from 'waffle-charts/schemas';

const props = {
  data: [{ x: 'A', y: 1 }, { x: 'B', y: 2 }],
  xKey: 'x',
  yKey: 'y',
  width: 500,
  height: 300,
};

const validation = validateProps('BarChart', props);

if (!validation.valid) {
  console.error('Invalid props:', validation.errors);
  validation.errors.forEach(err => {
    console.error(`  ${err.path}: ${err.message}`);
  });
}
```

**Validation errors:**

```typescript
interface ValidationError {
  /** Property path (e.g., 'data[0].y', 'width') */
  path: string;
  
  /** Error message */
  message: string;
  
  /** Expected type or value */
  expected: string;
  
  /** Actual value received */
  actual: any;
}
```

### Development Mode Validation

Wrap components for automatic validation in development:

```typescript
import { createValidatedComponent } from 'waffle-charts/schemas';
import { BarChart } from 'waffle-charts/bar-chart';

const ValidatedBarChart = createValidatedComponent(BarChart, 'BarChart');

// In development: logs warnings for invalid props
// In production: no validation overhead
export default ValidatedBarChart;
```

**Console output in development:**

```
[WaffleCharts] Warning: Invalid props for BarChart
  data: Expected array, received undefined
  xKey: Required property missing
```

### Generate Schema for Documentation

```typescript
import { generateSchema } from 'waffle-charts/schemas';

const schema = generateSchema('BarChart');

console.log(JSON.stringify(schema, null, 2));
// {
//   "$schema": "http://json-schema.org/draft-07/schema#",
//   "title": "BarChart Props",
//   "type": "object",
//   "properties": {
//     "data": {
//       "type": "array",
//       "items": { "type": "object" }
//     },
//     "xKey": { "type": "string" },
//     "yKey": { "type": "string" },
//     ...
//   },
//   "required": ["data", "xKey", "yKey"]
// }
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Open coverage report in browser
npm run test:coverage:ui
```

### Coverage Thresholds

Configured in `vitest.config.ts`:

```typescript
coverage: {
  lines: 80,
  functions: 80,
  branches: 75,
  statements: 80,
}
```

**Current coverage:** 379 tests, all passing, coverage exceeds thresholds.

### Test Categories

**1. Unit tests** — Component rendering and behavior
- Props handling
- Event callbacks
- Conditional rendering
- Error boundaries

**2. Accessibility tests** — WCAG compliance
- Keyboard navigation
- ARIA attributes
- Focus management
- Screen reader support

**3. Empty data tests** — Resilience
- `data={[]}`
- `data={null}`
- `data={undefined}`
- Custom empty messages

**4. Performance tests** — React.memo behavior
- Skips rerenders with unchanged props
- Rerenders with changed props
- Callback reference stability

**5. Metadata tests** — Registry integrity
- All components have metadata
- Required fields present
- Data requirements valid
- Examples compile

**6. Selector tests** — Recommendation algorithm
- Relationship scoring
- Data point range matching
- Capability filtering
- Edge cases (empty criteria, no matches)

### Writing Tests

**Test a chart component:**

```typescript
import { render, screen } from '@testing-library/react';
import { BarChart } from '../BarChart';

describe('BarChart', () => {
  const data = [
    { label: 'A', value: 10 },
    { label: 'B', value: 20 },
  ];

  it('renders bars for each data point', () => {
    render(<BarChart data={data} xKey="label" yKey="value" />);
    
    // Find by accessible name (auto-generated)
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(<BarChart data={[]} xKey="label" yKey="value" />);
    
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });
});
```

**Test keyboard navigation:**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('navigates data points with arrow keys', async () => {
  const user = userEvent.setup();
  render(<BarChart data={data} xKey="x" yKey="y" />);
  
  const chart = screen.getByRole('img');
  
  // Focus chart
  await user.tab();
  expect(chart).toHaveFocus();
  
  // Navigate with arrows
  await user.keyboard('{ArrowRight}');
  // Assert focused point changed (check aria-live announcement)
  
  await user.keyboard('{Enter}');
  // Assert point selected (check callback or visual state)
});
```

**Test React.memo behavior:**

```typescript
import { render } from '@testing-library/react';
import { BarChart } from '../BarChart';

it('skips rerenders when props unchanged', () => {
  const renderSpy = vi.fn();
  const DataComponent = ({ data }) => {
    renderSpy();
    return <BarChart data={data} xKey="x" yKey="y" />;
  };

  const { rerender } = render(<DataComponent data={[{ x: 'A', y: 1 }]} />);
  
  expect(renderSpy).toHaveBeenCalledTimes(1);
  
  // Rerender with same data (new array, same values)
  rerender(<DataComponent data={[{ x: 'A', y: 1 }]} />);
  
  // Chart component should NOT rerender
  expect(renderSpy).toHaveBeenCalledTimes(1);
});
```

### Mocking

**Mock tooltip:**

```typescript
vi.mock('@visx/tooltip', () => ({
  useTooltip: () => ({
    showTooltip: vi.fn(),
    hideTooltip: vi.fn(),
    tooltipOpen: false,
  }),
}));
```

**Mock responsive parent:**

```typescript
vi.mock('@visx/responsive', () => ({
  ParentSize: ({ children }) => children({ width: 500, height: 300 }),
}));
```

## Performance Optimization

### React.memo Implementation

All charts use `React.memo` with custom comparison:

```typescript
export const BarChart = React.memo(<T extends Record<string, any>>(
  props: BarChartProps<T>
) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom deep equality check
  return deepEqual(prevProps, nextProps, 8);
});
```

**Comparison logic:**
- Primitives: strict equality (`===`)
- Arrays: structural comparison up to 8 levels deep
- Objects: structural comparison up to 8 levels deep
- Functions: reference equality (must be memoized externally)
- Dates, Maps, Sets: reference equality

### Best Practices

**1. Memoize callbacks:**

```tsx
// ❌ Don't: new function every render
<BarChart onClick={(d) => console.log(d)} />

// ✅ Do: stable function reference
const handleClick = useCallback((d) => console.log(d), []);
<BarChart onClick={handleClick} />
```

**2. Stable data references:**

```tsx
// ❌ Don't: new array every render (unless values changed)
const data = salesData.map(d => ({ x: d.month, y: d.revenue }));
<BarChart data={data} />

// ✅ Do: memoize transformation
const data = useMemo(
  () => salesData.map(d => ({ x: d.month, y: d.revenue })),
  [salesData]
);
<BarChart data={data} />
```

**3. Inline literals are OK:**

```tsx
// ✅ This is fine: structural comparison handles it
<BarChart data={[{ x: 'A', y: 1 }, { x: 'B', y: 2 }]} />
```

**4. Avoid deep nesting:**

```tsx
// ⚠️ May not memoize (>8 levels deep)
<BarChart data={deeply.nested.data.structure.beyond.eight.levels.deep} />

// ✅ Flatten or extract
const flatData = useMemo(() => extractData(deepStructure), [deepStructure]);
<BarChart data={flatData} />
```

### Measuring Performance

**React DevTools Profiler:**

1. Install React DevTools browser extension
2. Open Profiler tab
3. Click "Record"
4. Interact with your app
5. Stop recording
6. Look for charts in the flame graph
7. Check "Did not render" (successful memo skip)

**Performance timeline:**

```tsx
import { Profiler } from 'react';

<Profiler
  id="BarChart"
  onRender={(id, phase, actualDuration) => {
    console.log(`${id} ${phase} took ${actualDuration}ms`);
  }}
>
  <BarChart data={data} xKey="x" yKey="y" />
</Profiler>
```

## CLI Development

### Project Structure

```
cli/
├── src/
│   ├── commands/
│   │   ├── add.ts        # Add component command
│   │   └── list.ts       # List components command
│   ├── registry/
│   │   └── index.ts      # Component registry
│   ├── selector/
│   │   └── index.ts      # Chart selection logic
│   └── index.ts          # CLI entry point
├── tests/
│   ├── add.test.ts
│   ├── selector.test.ts
│   └── security.test.ts
└── package.json
```

### Adding a New Chart to Registry

```typescript
// cli/src/registry/index.ts

export const registry = [
  {
    name: 'my-new-chart',
    displayName: 'My New Chart',
    category: 'statistical',
    description: 'Visualizes XYZ data',
    capabilities: ['interactive', 'categorical'],
    dataRequirements: {
      minPoints: 2,
      maxPoints: 1000,
      shape: 'flat',
      requiredFields: ['x', 'y'],
    },
    relationships: ['comparison', 'distribution'],
    useCases: [
      'Comparing values across categories',
      'Showing distribution patterns',
    ],
    example: `
      <MyNewChart 
        data={data}
        xKey="category"
        yKey="value"
      />
    `,
    sourcePath: 'src/charts/MyNewChart.tsx',
  },
];
```

## Contributing

### Pull Request Checklist

- [ ] Tests added/updated (unit + accessibility)
- [ ] Tests passing (`npm test`)
- [ ] Coverage thresholds met
- [ ] TypeScript builds without errors (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated (if adding features)
- [ ] CHANGELOG.md updated
- [ ] Accessibility verified (keyboard + screen reader)

### Code Style

- Use TypeScript for type safety
- Follow existing naming conventions
- Write JSDoc comments for public APIs
- Keep functions small and focused
- Prefer composition over inheritance

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(charts): add new radar chart component
fix(bar-chart): handle negative values correctly
docs(accessibility): update keyboard navigation guide
test(selector): add edge cases for empty criteria
chore(deps): update visx to 3.12.0
```

## Resources

- [Project README](../README.md)
- [Accessibility Guide](./ACCESSIBILITY.md)
- [Migration Guide](../MIGRATION.md)
- [Changelog](../CHANGELOG.md)
- [GitHub Repository](https://github.com/surprisewaffles-io/waffle-charts)
- [Issue Tracker](https://github.com/surprisewaffles-io/waffle-charts/issues)
