import prompts from 'prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { fileURLToPath } from 'url';
import { registry, resolveComponent } from '../registry.js';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Does the name exist on disk at all? Unlike fs.existsSync this does not follow
// symlinks, so a dangling symlink counts as existing. That matters for the
// traversal check below: if we skipped over a dangling symlink we would resolve
// the wrong ancestor and then let mkdirp follow the link out of the project.
function lexists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

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

  // The check above is lexical, so a symlink inside the project pointing out of
  // it still passes. Resolve the nearest ancestor that exists and re-check
  // against the real cwd. Anything below that ancestor does not exist yet, so it
  // cannot itself be a symlink.
  let probe = targetDir;
  while (!lexists(probe) && probe !== path.dirname(probe)) {
    probe = path.dirname(probe);
  }

  let realBase;
  let realCwd;
  try {
    realBase = fs.realpathSync(probe);
    realCwd = fs.realpathSync(process.cwd());
  } catch {
    // A dangling symlink or a race lands here. We cannot prove the target stays
    // inside the project, so refuse.
    console.error(chalk.red(`Error: Path "${options.path}" could not be resolved on disk.`));
    process.exit(1);
  }

  const realRelative = path.relative(realCwd, realBase);
  if (realRelative !== '' && (realRelative.startsWith('..') || path.isAbsolute(realRelative))) {
    console.error(chalk.red(`Error: Path "${options.path}" resolves outside the project directory`));
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
    const isYarn = fs.existsSync('yarn.lock');
    const cmd = isYarn ? 'yarn' : 'npm';
    const subcommand = isYarn ? 'add' : 'install';
    const args = [subcommand, '--ignore-scripts', ...Array.from(dependencies)];

    // execFileSync, not execSync: the argument vector never reaches a shell, so
    // a package name containing shell metacharacters is passed through as a
    // literal argument instead of being executed. --ignore-scripts stops a
    // freshly downloaded dependency from running install hooks on this machine.
    // On Windows npm and yarn are .cmd shims, which Node will only spawn
    // through a shell; name the shim directly so we can keep shell off.
    const binary = process.platform === 'win32' ? `${cmd}.cmd` : cmd;

    // Let the package manager write straight to the terminal so a blocked
    // lifecycle script or an audit warning is visible; stop the spinner first so
    // the two do not fight over the line.
    dependencySpinner.stop();
    execFileSync(binary, args, { stdio: 'inherit', shell: false });
    dependencySpinner.succeed('Dependencies installed');
  } catch (error) {
    dependencySpinner.fail('Failed to install dependencies');
    console.error(error);
  }

  // 5. Copy Files
  for (const comp of selectedComponents) {
    const entry = registry[comp];
    const templatePath = path.join(__dirname, '../../templates', entry.file);
    const destPath = path.join(targetDir, entry.file);

    // Check template exists
    if (!fs.existsSync(templatePath)) {
      ora(`Adding ${entry.label}...`).start()
        .fail(`Template for ${comp} not found at ${templatePath}`);
      continue;
    }

    // Ask before clobbering a file the user may have customized. The prompt runs
    // before the spinner starts, because a spinning ora corrupts prompt output.
    // Default is "no": a dropped or non-interactive answer skips rather than
    // destroys. `--force` is the opt-out for scripted runs.
    if (fs.existsSync(destPath) && !options.force) {
      const response = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: `${entry.file} already exists. Overwrite?`,
        initial: false
      });

      if (!response || response.overwrite !== true) {
        console.log(chalk.yellow(`Skipped ${entry.label} (file exists)`));
        continue;
      }
    }

    const spinner = ora(`Adding ${entry.label}...`).start();
    try {
      // COPYFILE_EXCL fails instead of writing when destPath already exists.
      // Without it, a symlink planted at destPath would be followed and the
      // template written to wherever it points.
      try {
        fs.copyFileSync(templatePath, destPath, fs.constants.COPYFILE_EXCL);
      } catch (copyError) {
        if (copyError.code !== 'EEXIST') throw copyError;

        // Re-running the CLI over an existing component used to overwrite, so
        // keep that. Unlink by name first: unlink never follows a symlink, so
        // the fresh COPYFILE_EXCL copy writes a real file at destPath.
        if (fs.lstatSync(destPath).isSymbolicLink()) {
          spinner.fail(`Refusing to overwrite symlink at ${options.path}/${entry.file}`);
          continue;
        }
        fs.unlinkSync(destPath);
        fs.copyFileSync(templatePath, destPath, fs.constants.COPYFILE_EXCL);
      }
      spinner.succeed(`Added ${entry.label} to ${options.path}/${entry.file}`);
    } catch (error) {
      spinner.fail(`Failed to copy ${comp}`);
      console.error(error);
    }
  }

  console.log(chalk.green('\nDone! Happy charting with WaffleCharts. 🧇'));
}
