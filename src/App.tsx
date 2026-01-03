import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DocsLayout } from './layouts/DocsLayout';
import { IntroductionPage } from './pages/Introduction';
import { BarChartPage } from './pages/charts/BarChartPage';
import { LineChartPage } from './pages/charts/LineChartPage';
import { PieChartPage } from './pages/charts/PieChartPage';
import { AreaChartPage } from './pages/charts/AreaChartPage';
import { RadarChartPage } from './pages/charts/RadarChartPage';
import { ScatterChartPage } from './pages/charts/ScatterChartPage';
import { HeatmapChartPage } from './pages/charts/HeatmapChartPage';
import { TreemapChartPage } from './pages/charts/TreemapChartPage';
import { BubbleChartPage } from './pages/charts/BubbleChartPage';
import { SankeyChartPage } from './pages/charts/SankeyChartPage';
import { CompositeChartPage } from './pages/charts/CompositeChartPage';
import { ChordChartPage } from './pages/charts/ChordChartPage';
import { CandlestickChartPage } from './pages/charts/CandlestickChartPage';
import { StatCardPage } from './pages/charts/StatCardPage';
import { FunnelChartPage } from './pages/charts/FunnelChartPage';
import { RadialBarChartPage } from './pages/charts/RadialBarChartPage';
import { WaffleChartPage } from './pages/charts/WaffleChartPage';
import { GalleryPage } from './pages/Gallery';
import { ThemeProvider } from './components/theme-provider';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="waffle-ui-theme">
      <HashRouter>
        <Routes>
          <Route path="/" element={<DocsLayout />}>
            <Route index element={<IntroductionPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="docs/bar-chart" element={<BarChartPage />} />
            <Route path="docs/line-chart" element={<LineChartPage />} />
            <Route path="docs/pie-chart" element={<PieChartPage />} />
            <Route path="docs/area-chart" element={<AreaChartPage />} />
            <Route path="docs/radar-chart" element={<RadarChartPage />} />
            <Route path="docs/scatter-chart" element={<ScatterChartPage />} />
            <Route path="docs/heatmap" element={<HeatmapChartPage />} />
            <Route path="docs/treemap" element={<TreemapChartPage />} />
            <Route path="docs/sankey-chart" element={<SankeyChartPage />} />
            <Route path="docs/composite-chart" element={<CompositeChartPage />} />
            <Route path="docs/chord-chart" element={<ChordChartPage />} />
            <Route path="docs/bubble-chart" element={<BubbleChartPage />} />
            <Route path="docs/candlestick-chart" element={<CandlestickChartPage />} />
            <Route path="docs/stat-card" element={<StatCardPage />} />
            <Route path="docs/funnel-chart" element={<FunnelChartPage />} />
            <Route path="docs/radial-bar-chart" element={<RadialBarChartPage />} />
            <Route path="docs/waffle-chart" element={<WaffleChartPage />} />
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App
