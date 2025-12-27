# Contributing to WaffleCharts

Thank you for your interest in contributing to WaffleCharts! This document explains how to run the project locally and work on the CLI.

## Running the Documentation Site

The documentation site (the gallery and component pages) is built with Vite.

1.  **Install dependencies**:
    ```bash
    npm install
    # If prompted about peer dependencies (common with @visx/sankey and React 19), use:
    npm install --legacy-peer-deps
    ```

2.  **Start the development server**:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:5173](http://localhost:5173) in your browser.

## Testing the CLI Locally

The CLI source code is located in the `cli/` directory.

1.  **Navigate to the CLI directory**:
    ```bash
    cd cli
    ```

2.  **Install CLI dependencies**:
    ```bash
    npm install
    ```

3.  **Link the CLI globally**:
    This allows you to run `waffle-charts-cli` or `waffle` commands from anywhere on your machine, using your local source code.
    ```bash
    npm link
    ```

4.  **Test your changes**:
    Create a temporary test folder elsewhere on your machine and try adding a chart:
    ```bash
    mkdir ~/temp-test-project
    cd ~/temp-test-project
    waffle-charts-cli add bar-chart
    ```

## Running Tests

We use Vitest for unit testing.

```bash
npm test
```

## Project Structure

-   `src/components/waffle/`: The source of truth for all chart components.
-   `src/pages/`: Documentation pages for each chart.
-   `cli/templates/`: The *copies* of the components used by the CLI.
    -   **Important**: When you update a component in `src/components/waffle/`, you usually need to copy it to `cli/templates/` so the CLI distributes the updated version.
    -   (We may automate this sync in the future).

## Deployment

Deployment to GitHub Pages is handled by the maintainers.

