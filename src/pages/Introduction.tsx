export function IntroductionPage() {
  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <div className="space-y-4 border-b pb-8">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Introduction</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Beautiful, headless, copy-pasteable charts for React.
          Built with <span className="text-foreground font-medium">Visx</span> power and <span className="text-foreground font-medium">Tailwind CSS</span> simplicity.
        </p>
      </div>

      {/* Philosophy Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Why WaffleCharts?</h2>
        <div className="prose prose-gray dark:prose-invert max-w-none text-muted-foreground">
          <p className="leading-7">
            Building charts in React often forces a difficult choice: use a high-level library that's easy to start but hard to customize,
            or build from scratch with low-level primitives.
          </p>
          <p className="leading-7">
            WaffleCharts bridges this gap. It's not a library you install; it's a collection of <strong>copy-pasteable primitives</strong>.
            You get the full power of D3 and Visx for the math, but the DOM structure and styling live directly in your codebase.
          </p>
        </div>
      </div>

      {/* Key Features Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">Completely Headless</h3>
          <p className="text-sm text-muted-foreground">
            You own the rendered markup. No more fighting with library-specific prop names to change a simple SVG attribute.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">Tailwind Native</h3>
          <p className="text-sm text-muted-foreground">
            Style everything with utility classes. Context-aware hover states, dark mode, and responsive designs just work.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">TypeScript First</h3>
          <p className="text-sm text-muted-foreground">
            Written in strict TypeScript. Generics allow your data shape to drive the chart's type safety from top to bottom.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">Accessible by Default</h3>
          <p className="text-sm text-muted-foreground">
            WCAG 2.1 Level AA compliant. Full keyboard navigation, screen reader support, and focus indicators built in.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">Performance Optimized</h3>
          <p className="text-sm text-muted-foreground">
            React.memo on all charts skips unnecessary rerenders. Smart structural comparison keeps your dashboards fast.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">Zero Vulnerabilities</h3>
          <p className="text-sm text-muted-foreground">
            All 20 dependency vulnerabilities resolved. CLI hardened against path traversal and command injection.
          </p>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">Use Cases</h2>
        <div className="grid gap-8 md:grid-cols-2">
          {/* Perfect For */}
          <div className="space-y-4">
            <h3 className="text-xl font-medium flex items-center gap-2">
              <span className="text-green-500">✓</span> Perfect For
            </h3>
            <ul className="space-y-3 text-muted-foreground list-disc pl-5">
              <li>
                <strong className="text-foreground">Design Systems:</strong> When your charts need to match your specific brand guidelines, font stacks, and border radii exactly.
              </li>
              <li>
                <strong className="text-foreground">Dashboard Applications:</strong> When you need charts that interact seamlessly with other UI elements (tooltips, state, filters).
              </li>
              <li>
                <strong className="text-foreground">Unique Visualizations:</strong> When "out of the box" charts get you 90% of the way there, but that last 10% is impossible to implement.
              </li>
            </ul>
          </div>

          {/* Not Ideal For */}
          <div className="space-y-4">
            <h3 className="text-xl font-medium flex items-center gap-2">
              <span className="text-red-500">✕</span> Not Ideal For
            </h3>
            <ul className="space-y-3 text-muted-foreground list-disc pl-5">
              <li>
                <strong className="text-foreground">Rapid Prototyping:</strong> If you just need to throw a chart on a page in 30 seconds and don't care how it looks, use Recharts or Chart.js.
              </li>
              <li>
                <strong className="text-foreground">Massive Datasets:</strong> For visualizing millions of points, you likely need a WebGL-based solution like Deck.gl.
              </li>
              <li>
                <strong className="text-foreground">Non-React Environments:</strong> WaffleCharts relies heavily on React's component model and state management.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Getting Started Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Getting Started</h2>
        <p className="text-muted-foreground text-lg">
          You can add components to your project using our CLI (Recommended) or by manually copying the code.
        </p>

        <div className="mt-8 space-y-8">
          {/* Method 1: CLI */}
          <div className="space-y-4">
            <h3 className="text-xl font-medium flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">1</span>
              CLI (Recommended)
            </h3>
            <p className="text-muted-foreground">
              Run the `add` command to interactively select charts. This will automatically install dependencies and copy the source code to your project.
            </p>
            <pre className="p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto border relative">
              <code>
                npx waffle-charts-cli add
              </code>
            </pre>
            <p className="text-sm text-muted-foreground">
              Or add a specific chart directly:
            </p>
            <pre className="p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto border relative">
              <code>
                npx waffle-charts-cli add bar-chart
              </code>
            </pre>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Method 2: Manual */}
          <div className="space-y-4">
            <h3 className="text-xl font-medium flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs text-secondary-foreground font-bold">2</span>
              Manual Installation
            </h3>
            <p className="text-muted-foreground">
              Manually install the core dependencies and then copy the component code from the documentation.
            </p>
            <pre className="p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto border">
              <code>
                npm install @visx/shape @visx/group @visx/scale @visx/responsive @visx/tooltip @visx/axis @visx/grid @visx/curve @visx/event @visx/glyph d3-array clsx tailwind-merge lucide-react
              </code>
            </pre>
            <p className="text-sm text-muted-foreground">
              Then navigate to any chart page, copy the code, and paste it into your project.
            </p>
          </div>
        </div>
      </div>

      {/* What's New Section */}
      <div className="space-y-6 border rounded-lg p-6 bg-card">
        <h2 className="text-2xl font-semibold tracking-tight">What's New in v0.2.0</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <span className="text-primary">♿</span> Accessibility
            </h3>
            <p className="text-sm text-muted-foreground">
              Full WCAG 2.1 Level AA compliance across all 16 charts. Keyboard navigation with Tab, Arrow keys, Enter, and Escape.
              Screen reader support with ARIA labels, off-screen data tables, and live announcements.
            </p>
            <a href="#/docs/accessibility" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              View Accessibility Guide →
            </a>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <span className="text-primary">⚡</span> Performance
            </h3>
            <p className="text-sm text-muted-foreground">
              All charts wrapped in React.memo with smart structural comparison. Parent rerenders no longer trigger
              expensive chart layout recalculations when props haven't changed.
            </p>
            <a href="https://github.com/surprisewaffles-io/waffle-charts/blob/main/README.md#performance" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              Read Performance Guide →
            </a>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <span className="text-primary">🔒</span> Security
            </h3>
            <p className="text-sm text-muted-foreground">
              20 dependency vulnerabilities eliminated (1 critical, 14 high, 4 moderate, 1 low).
              CLI hardened against path traversal, command injection, and unauthorized file overwrites.
            </p>
            <a href="https://github.com/surprisewaffles-io/waffle-charts/blob/main/README.md#security" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              View Security Details →
            </a>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <span className="text-primary">🧪</span> Testing
            </h3>
            <p className="text-sm text-muted-foreground">
              379 passing tests (398% increase). Comprehensive coverage: accessibility, empty data handling,
              performance validation, and chart selector algorithm testing.
            </p>
            <a href="https://github.com/surprisewaffles-io/waffle-charts/blob/main/docs/DEVELOPER.md#testing" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              Developer Guide →
            </a>
          </div>
        </div>
      </div>

      {/* Documentation Links */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Documentation</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="https://github.com/surprisewaffles-io/waffle-charts/blob/main/docs/ACCESSIBILITY.md"
            className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-2">Accessibility Guide</h3>
            <p className="text-sm text-muted-foreground">
              WCAG 2.1 Level AA compliance details, keyboard navigation reference, screen reader testing guide.
            </p>
          </a>

          <a
            href="https://github.com/surprisewaffles-io/waffle-charts/blob/main/docs/DEVELOPER.md"
            className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-2">Developer Guide</h3>
            <p className="text-sm text-muted-foreground">
              Component metadata, chart selector, JSON schemas, testing strategies, performance optimization.
            </p>
          </a>

          <a
            href="https://github.com/surprisewaffles-io/waffle-charts/blob/main/MIGRATION.md"
            className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-2">Migration Guide</h3>
            <p className="text-sm text-muted-foreground">
              Upgrading to v0.2.0 with complete backwards compatibility. All changes are opt-in enhancements.
            </p>
          </a>

          <a
            href="https://github.com/surprisewaffles-io/waffle-charts/blob/main/CHANGELOG.md"
            className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-2">Changelog</h3>
            <p className="text-sm text-muted-foreground">
              Complete version history following Keep a Changelog format. Detailed list of all improvements.
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
