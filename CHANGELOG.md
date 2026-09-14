# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Gradient flow ribbons in `SankeyChart`** — each link now fades from its source
  node's colour to its target node's colour, so a flow reads as leaving one column
  and arriving at the next (Solar purple → Grid teal, Grid teal → Industry orange)
  - One `<linearGradient>` per link in a `<defs>` block, with stops at `0%` and `100%`
  - Gradient ids are scoped per mounted chart, so two Sankeys on a page keep their
    own colours instead of both resolving to the first `<defs>`
  - Ribbon thickness, hover opacity (0.2 → 0.5), and tooltips are unchanged
- **WCAG 2.1 Level AA accessibility compliance** for all 16 charts
  - Keyboard navigation (Tab, Arrow keys, Home, End, Enter, Space, Escape)
  - ARIA attributes and screen reader support with `role="img"`, `aria-label`, and semantic structure
  - Focus indicators with validated contrast ratios (5.57:1 light theme, 9.07:1 dark theme)
  - Off-screen data tables accessible via `aria-details` for assistive technology
  - Live region announcements for focused data points
  - Applies to: `AreaChart`, `BarChart`, `BubbleChart`, `CandlestickChart`, `ChartLegend`, `ChordChart`, `CompositeChart`, `FunnelChart`, `HeatmapChart`, `LineChart`, `PieChart`, `RadarChart`, `RadialBarChart`, `SankeyChart`, `ScatterChart`, `TreemapChart`, `WaffleChart`
- **React.memo performance optimization** for all chart components
  - Smart memoization with structural comparison prevents unnecessary rerenders
  - Deep equality checks for data arrays (up to 8 levels) and object props
  - Reference equality for functions to preserve closure semantics
  - Props compared structurally so inline array literals skip rerenders when values unchanged
  - Preserves TypeScript generics across the memo boundary
- **Enhanced component registry** with comprehensive metadata
  - Data requirements and shape validation for each chart type
  - Capabilities matrix (interactive, categorical, temporal, hierarchical, relational, geospatial)
  - Recommended use cases and data point count ranges
  - Code examples for every component
  - 158 tests ensuring registry integrity and metadata accuracy
- **Chart selector helper** with intelligent recommendation system
  - Multi-axis scoring: relationship type, data structure, data point count, interactivity needs
  - Decision tree algorithm for chart selection
  - Programmatic API: `recommend({ relationship, dataPoints, structure })`
  - 62 tests covering all selection scenarios
- **Component metadata extraction** for runtime type introspection
  - `getComponentMeta(componentName)` returns full metadata object
  - `validateDataShape(componentName, data)` validates data against requirements
  - TypeScript-powered metadata with full type safety
- **JSON Schema generation** for prop validation
  - `validateProps(componentName, props)` for runtime validation
  - Automatic schema extraction from TypeScript prop types
  - Development-mode warnings for invalid props
- **Empty data resilience** for all 16 charts
  - Charts render fallback message instead of crashing on empty, `null`, or `undefined` data
  - Customizable message via `emptyMessage` prop
  - Covers: `AreaChart`, `BarChart`, `BubbleChart`, `CandlestickChart`, `ChordChart`, `CompositeChart`, `FunnelChart`, `HeatmapChart`, `LineChart`, `PieChart`, `RadarChart`, `RadialBarChart`, `SankeyChart`, `ScatterChart`, `TreemapChart`, `WaffleChart`
- **CLI `--force` flag** for non-interactive file overwrites
  - Skips confirmation prompt in automated workflows
  - Validates paths and prevents overwrites without explicit approval in interactive mode

### Fixed

- **`SankeyChart` rendered no link ribbons** — only the node bars appeared
  - The link `<path>` read a `path` property off each laid-out link, but d3-sankey never sets one, so every ribbon rendered with an empty `d`
  - The geometry now comes from `createPath`, the `sankeyLinkHorizontal` generator the visx `Sankey` render prop supplies
  - A `size` prop was also overriding `extent`, discarding the chart's margins; `extent` is now the only layout prop passed
  - Link hover used `hover:stroke-opacity-50`, which is not a Tailwind utility and never applied; replaced with an arbitrary-property variant
  - Applies to both `src/components/waffle/SankeyChart.tsx` and the `waffle-charts add sankey` CLI template
- **SECURITY: 20 dependency vulnerabilities resolved** (1 critical, 14 high, 4 moderate, 1 low)
  - Updated all packages to latest secure versions
  - Zero vulnerabilities remaining (`npm audit` clean)
- **SECURITY: CLI path traversal vulnerability** with symlink bypass protection
  - `waffle-charts add --path` now resolves symlinks before path validation
  - Prevents writing files outside project boundaries via symlink exploits
  - Symlinks at destination are refused instead of written through
- **SECURITY: Command injection risk in CLI**
  - Switched from shell string concatenation to `execFileSync` with argument arrays
  - Package manager spawned directly without shell interpolation
  - Added `--ignore-scripts` flag to prevent npm lifecycle hook execution
- **SECURITY: Silent file overwrite in CLI**
  - User confirmation now required before overwriting existing files
  - `--force` flag available for automation but must be explicit
- **Empty data crashes** across all 16 charts
  - `AreaChart`: Fixed `Math.min`/`Math.max` on empty arrays producing `Infinity`/`-Infinity`
  - `HeatmapChart`: Fixed division by zero when row count is zero
  - All charts: Added empty data guards that render before hook calls
- **Hook-order violations** in conditional rendering
  - `CompositeChart` moved size guard below all hooks to maintain consistent hook count
  - All charts now call hooks unconditionally before any early returns
- **Scale domain calculations** on invalid data
  - Charts no longer spread empty arrays through `Math.min`/`Math.max`
  - Domain calculations skip empty datasets and use sensible defaults
- **Props mutation in SankeyChart**
  - Chart no longer hands caller's arrays directly to d3-sankey
  - Link endpoints copied before d3 rewrites them in place
- **Lint errors**: 98 → 0 across all files
  - Removed all unused imports and variables
  - Fixed all ESLint rule violations
- **Type safety**: Removed all 22 `as any` type casts
  - Replaced with proper TypeScript types and generics
  - Full type inference preserved throughout

### Changed

- **Test coverage**: 76 → 379 tests (+303 tests, 398% increase)
  - Accessibility testing for keyboard navigation and ARIA attributes
  - Empty data handling tests for all charts
  - Performance tests for React.memo behavior
  - Registry integrity and metadata accuracy tests
  - Chart selector recommendation algorithm tests
- **Performance**: All charts skip rerenders when props unchanged
  - Parent re-renders no longer trigger chart layout recalculation
  - Callbacks must be wrapped in `useCallback` to remain stable
- **CLI**: Enhanced validation and security posture
  - Path resolution happens before validation checks
  - Dependency installation isolated from shell injection
  - File operations require explicit user consent

## [0.1.6] - 2024-12-XX

### Added
- `FunnelChart` for process and conversion visualization
- `RadialBarChart` for circular progress and comparison
- `WaffleChart` for parts-to-whole visualization
- `ChartLegend` component for consistent legend rendering

## [0.1.5] - 2024-11-XX

### Added
- `CandlestickChart` for OHLC financial data visualization
- Vibrant default color palette (purple/pink)
- Hex color support alongside Tailwind classes
- `StatCard` component for single-value displays

### Changed
- Enhanced tooltip readability with solid backgrounds
- Improved z-index handling for overlays

### Fixed
- Fluid chart layout reliability in all container sizes

## [0.1.0] - 2024-10-XX

### Added
- Initial release with core chart components
- CLI tool for component installation
- Visx and Tailwind CSS integration
- Copy-paste component philosophy

[Unreleased]: https://github.com/surprisewaffles-io/waffle-charts/compare/v0.1.6...HEAD
[0.1.6]: https://github.com/surprisewaffles-io/waffle-charts/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/surprisewaffles-io/waffle-charts/compare/v0.1.0...v0.1.5
[0.1.0]: https://github.com/surprisewaffles-io/waffle-charts/releases/tag/v0.1.0
