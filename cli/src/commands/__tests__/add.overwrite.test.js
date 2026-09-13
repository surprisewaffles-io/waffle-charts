/**
 * Why: `add` used to call `fs.copyFileSync` unconditionally, so a second run
 * silently destroyed a component the user had customized (security audit
 * MEDIUM-3). These cases pin the confirmation prompt and the `--force` opt-out.
 * What: Runs the real `add` against a temporary working directory with real
 * file I/O, stubbing only the prompt, the spinner, and dependency installation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import prompts from 'prompts';
import { execSync } from 'child_process';
import { add } from '../add.js';

vi.mock('child_process');
vi.mock('prompts', () => ({ default: vi.fn() }));
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis()
  }))
}));

const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../templates'
);
const BAR_TEMPLATE = fs.readFileSync(path.join(TEMPLATES_DIR, 'BarChart.tsx'), 'utf-8');
const LINE_TEMPLATE = fs.readFileSync(path.join(TEMPLATES_DIR, 'LineChart.tsx'), 'utf-8');

const CUSTOMIZED = '// my hand-edited chart\nexport const BarChart = () => null;\n';
const TARGET = 'components';

describe('add command - overwrite protection', () => {
  let tmpDir;
  let originalCwd;
  let consoleLogSpy;

  /** Seeds `components/<file>` with `contents` and returns its absolute path. */
  const seed = (file, contents) => {
    const dest = path.join(tmpDir, TARGET, file);
    fs.mkdirpSync(path.dirname(dest));
    fs.writeFileSync(dest, contents);
    return dest;
  };

  beforeEach(() => {
    originalCwd = process.cwd();
    // realpathSync matters on macOS, where /var symlinks to /private/var and
    // process.cwd() reports the resolved form the assertions compare against.
    tmpDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'waffle-add-'));
    process.chdir(tmpDir);

    execSync.mockImplementation(() => {});
    prompts.mockResolvedValue({});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (tmpDir) fs.removeSync(tmpDir);
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should leave the file unchanged and report Skipped when the user declines', async () => {
    const dest = seed('BarChart.tsx', CUSTOMIZED);
    prompts.mockResolvedValue({ overwrite: false });

    await add('bar-chart', { path: TARGET });

    expect(prompts).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'confirm', name: 'overwrite', initial: false })
    );
    expect(fs.readFileSync(dest, 'utf-8')).toBe(CUSTOMIZED);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Skipped'));
  });

  it('should overwrite the file when the user accepts', async () => {
    const dest = seed('BarChart.tsx', CUSTOMIZED);
    prompts.mockResolvedValue({ overwrite: true });

    await add('bar-chart', { path: TARGET });

    expect(prompts).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync(dest, 'utf-8')).toBe(BAR_TEMPLATE);
  });

  it('should overwrite without prompting when --force is set', async () => {
    const dest = seed('BarChart.tsx', CUSTOMIZED);

    await add('bar-chart', { path: TARGET, force: true });

    expect(prompts).not.toHaveBeenCalled();
    expect(fs.readFileSync(dest, 'utf-8')).toBe(BAR_TEMPLATE);
  });

  it('should skip rather than overwrite when the prompt is cancelled', async () => {
    const dest = seed('BarChart.tsx', CUSTOMIZED);
    prompts.mockResolvedValue({}); // prompts returns {} on Ctrl-C / non-interactive

    await add('bar-chart', { path: TARGET });

    expect(fs.readFileSync(dest, 'utf-8')).toBe(CUSTOMIZED);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Skipped'));
  });

  it('should write without prompting when the destination file does not exist', async () => {
    await add('bar-chart', { path: TARGET });

    expect(prompts).not.toHaveBeenCalled();
    expect(fs.readFileSync(path.join(tmpDir, TARGET, 'BarChart.tsx'), 'utf-8')).toBe(BAR_TEMPLATE);
  });

  it('should skip only the declined component and still add the rest', async () => {
    const barDest = seed('BarChart.tsx', CUSTOMIZED);
    // Call 1 is the multiselect, call 2 is the overwrite confirm for BarChart.
    // LineChart.tsx does not exist yet, so it never prompts.
    prompts.mockResolvedValueOnce({ components: ['bar-chart', 'line-chart'] });
    prompts.mockResolvedValueOnce({ overwrite: false });

    await add(undefined, { path: TARGET });

    expect(prompts).toHaveBeenCalledTimes(2);

    expect(fs.readFileSync(barDest, 'utf-8')).toBe(CUSTOMIZED);
    expect(fs.readFileSync(path.join(tmpDir, TARGET, 'LineChart.tsx'), 'utf-8')).toBe(LINE_TEMPLATE);
  });
});
