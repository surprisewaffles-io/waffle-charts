import '@testing-library/jest-dom';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Every chart now carries an off-screen data table plus an SVG `<title>` and
// `<desc>` so screen readers get the values and a summary (#5). All three
// repeat numbers the chart already draws, so a plain `getByText('101')` matches
// both the tooltip and the table cell and throws on the ambiguity. Skipping the
// generated text restores the narrower meaning a text query used to have —
// "find the visible text" — while role queries still reach the table and
// `container.querySelector` still reaches the title and description.
//
// Dropping the descendant clause filters nothing: `ignore` tests each candidate
// node against the selector, and the node holding the text is the `<td>`, not
// the `<table>`.
const CHART_A11Y_TEXT =
  '[data-chart-a11y-table], [data-chart-a11y-table] *, [data-chart-a11y-text]';

configure({ defaultIgnore: `script, style, ${CHART_A11Y_TEXT}` });

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock ResizeObserver globally
class ResizeObserverMock {
  observe() { }
  unobserve() { }
  disconnect() { }
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);
