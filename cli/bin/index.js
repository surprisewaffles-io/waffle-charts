#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { add } from '../src/commands/add.js';

const program = new Command();

const packageJson = JSON.parse(
  fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../package.json'),
    'utf-8'
  )
);

program
  .name('waffle-charts')
  .description('CLI to easily add WaffleCharts components to your React project')
  .version(packageJson.version);

program
  .command('add')
  .description('Add a chart component to your project')
  .argument('[component]', 'The component to add (e.g. bar-chart)')
  .option('-p, --path <path>', 'Path to add the component to', 'src/components/ui/waffle')
  .option('-f, --force', 'Overwrite existing component files without prompting', false)
  .action(add);

program.parse();
