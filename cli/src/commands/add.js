import prompts from 'prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { fileURLToPath } from 'url';
import { registry, resolveComponent } from '../registry.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function add(component, options) {
  let selectedComponents = component ? [component] : [];

  // 1. If no component provided, ask user
  if (!component) {
    const response = await prompts({
      type: 'multiselect',
      name: 'components',
      message: 'Which charts would you like to add?',
      choices: Object.entries(registry).map(([key, value]) => ({
        title: value.label,
        value: key
      })),
      min: 1
    });

    if (!response.components || response.components.length === 0) {
      console.log(chalk.yellow('No components selected. Exiting.'));
      process.exit(0);
    }
    selectedComponents = response.components;
  }

  // 2. Validate selections. A slug, a component name (BarChart), and a label
  // (Bar Chart) all resolve, so the spelling the registry advertises works here.
  selectedComponents = selectedComponents.map((comp) => {
    const slug = resolveComponent(comp);
    if (!slug) {
      console.error(chalk.red(`Error: Component "${comp}" not found in registry.`));
      process.exit(1);
    }
    return slug;
  });

  // Reject null bytes and other malicious patterns (check before path operations)
  if (options.path.includes('\0')) {
    console.error(chalk.red(`Error: Invalid path "${options.path}". Path contains illegal characters.`));
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), options.path);

  // Validate path to prevent directory traversal attacks
  const relativePath = path.relative(process.cwd(), targetDir);

  // Reject paths that escape the current working directory
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    console.error(chalk.red(`Error: Invalid path "${options.path}". Path must be within the current directory.`));
    process.exit(1);
  }

  // 3. Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    const spinner = ora(`Creating directory ${options.path}...`).start();
    fs.mkdirpSync(targetDir);
    spinner.succeed(`Created directory ${options.path}`);
  }

  // 4. Install Dependencies
  const dependencies = new Set();
  selectedComponents.forEach(comp => {
    registry[comp].dependencies.forEach(dep => dependencies.add(dep));
  });

  const dependencySpinner = ora('Installing dependencies...').start();
  try {
    // Detect package manager (simple check)
    const packageManager = fs.existsSync('yarn.lock') ? 'yarn add' : 'npm install';
    const installCmd = `${packageManager} ${Array.from(dependencies).join(' ')}`;
    execSync(installCmd, { stdio: 'ignore' });
    dependencySpinner.succeed('Dependencies installed');
  } catch (error) {
    dependencySpinner.fail('Failed to install dependencies');
    console.error(error);
  }

  // 5. Copy Files
  for (const comp of selectedComponents) {
    const spinner = ora(`Adding ${registry[comp].label}...`).start();
    const templatePath = path.join(__dirname, '../../templates', registry[comp].file);
    const destPath = path.join(targetDir, registry[comp].file);

    try {
      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, destPath);
        spinner.succeed(`Added ${registry[comp].label} to ${options.path}/${registry[comp].file}`);
      } else {
        spinner.fail(`Template for ${comp} not found at ${templatePath}`);
      }
    } catch (error) {
      spinner.fail(`Failed to copy ${comp}`);
      console.error(error);
    }
  }

  console.log(chalk.green('\nDone! Happy charting with WaffleCharts. 🧇'));
}
