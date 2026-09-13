/**
 * Symlink escapes against a real filesystem.
 *
 * The sibling add.security.test.js mocks fs-extra, so it can only prove the
 * lexical path checks. A symlink bypass is invisible to a mocked fs by
 * construction: the two vulnerabilities covered here (a symlinked target
 * directory pointing out of the project, and a symlink planted at the
 * destination filename) both turn on what the kernel does with a link, not on
 * what the path string looks like. So this file leaves fs-extra real and builds
 * actual symlinks in a temp directory.
 *
 * Only child_process and ora are mocked: dependency installation would hit the
 * network and is not what these tests are about.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { add } from '../add.js';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
  execSync: vi.fn()
}));
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis()
  }))
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(__dirname, '../../../templates/BarChart.tsx');

describe('add command - symlink escapes (real filesystem)', () => {
  let root;
  let project;
  let outside;
  let originalCwd;
  let exitSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // realpathSync because macOS /tmp is itself a symlink to /private/tmp; the
    // fixture has to be stated in resolved terms or every assertion below is
    // comparing two spellings of the same directory.
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'waffle-sec-')));
    project = path.join(root, 'project');
    outside = path.join(root, 'OUTSIDE');
    fs.mkdirpSync(project);
    fs.mkdirpSync(outside);

    originalCwd = process.cwd();
    process.chdir(project);

    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.removeSync(root);
    vi.restoreAllMocks();
  });

  it('rejects a target directory that is a symlink out of the project', async () => {
    // The audit's proof of concept: waffle-out -> ../OUTSIDE passed the lexical
    // check and the copy landed in OUTSIDE.
    fs.symlinkSync(path.join('..', 'OUTSIDE'), path.join(project, 'waffle-out'));

    await expect(add('bar-chart', { path: 'waffle-out' })).rejects.toThrow('process.exit(1)');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('resolves outside the project directory')
    );
    expect(fs.existsSync(path.join(outside, 'BarChart.tsx'))).toBe(false);
    expect(fs.readdirSync(outside)).toEqual([]);
  });

  it('rejects a path nested under a symlink out of the project', async () => {
    // Here the nested directory does not exist yet, so the check has to walk up
    // to the symlink before resolving.
    fs.symlinkSync(path.join('..', 'OUTSIDE'), path.join(project, 'waffle-out'));

    await expect(
      add('bar-chart', { path: 'waffle-out/charts' })
    ).rejects.toThrow('process.exit(1)');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('resolves outside the project directory')
    );
    expect(fs.existsSync(path.join(outside, 'charts'))).toBe(false);
  });

  it('rejects a dangling symlink instead of creating its target', async () => {
    // A dangling link is absent to existsSync, so walking up with existsSync
    // would skip past it, validate the project root, and then let mkdirp follow
    // the link and create the outside directory.
    fs.symlinkSync(path.join('..', 'NOPE'), path.join(project, 'dangle'));

    await expect(add('bar-chart', { path: 'dangle' })).rejects.toThrow('process.exit(1)');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('could not be resolved')
    );
    expect(fs.existsSync(path.join(root, 'NOPE'))).toBe(false);
  });

  it('rejects a symlink to an absolute path outside the project', async () => {
    fs.symlinkSync(outside, path.join(project, 'abs-link'));

    await expect(add('bar-chart', { path: 'abs-link' })).rejects.toThrow('process.exit(1)');

    expect(fs.readdirSync(outside)).toEqual([]);
  });

  it('does not follow a symlink planted at the destination filename', async () => {
    // COPYFILE_EXCL is what stops this: without it copyFileSync opens the link
    // target for writing and the template overwrites secret.txt.
    const secret = path.join(root, 'secret.txt');
    fs.writeFileSync(secret, 'ORIGINAL');

    const components = path.join(project, 'components');
    fs.mkdirpSync(components);
    fs.symlinkSync(secret, path.join(components, 'BarChart.tsx'));

    await add('bar-chart', { path: 'components' });

    expect(fs.readFileSync(secret, 'utf-8')).toBe('ORIGINAL');
    expect(fs.lstatSync(path.join(components, 'BarChart.tsx')).isSymbolicLink()).toBe(true);
  });

  it('writes the template into a real directory inside the project', async () => {
    await add('bar-chart', { path: 'src/components/waffle' });

    const written = path.join(project, 'src/components/waffle/BarChart.tsx');
    expect(fs.readFileSync(written, 'utf-8')).toBe(fs.readFileSync(TEMPLATE, 'utf-8'));
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('still overwrites an existing regular file on a repeat add', async () => {
    // COPYFILE_EXCL fails on an existing destination, so the repeat-add path had
    // to be handled explicitly. This guards that it was not turned into an error.
    const dir = path.join(project, 'components');
    fs.mkdirpSync(dir);
    const dest = path.join(dir, 'BarChart.tsx');
    fs.writeFileSync(dest, 'STALE');

    await add('bar-chart', { path: 'components' });

    expect(fs.readFileSync(dest, 'utf-8')).toBe(fs.readFileSync(TEMPLATE, 'utf-8'));
    expect(fs.lstatSync(dest).isSymbolicLink()).toBe(false);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

describe('add command - install invocation', () => {
  let root;
  let originalCwd;

  beforeEach(() => {
    // The execFileSync mock comes from the module factory, which restoreAllMocks
    // does not reset, so clear the calls recorded by the suite above.
    vi.clearAllMocks();
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'waffle-inst-')));
    originalCwd = process.cwd();
    process.chdir(root);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.removeSync(root);
    vi.restoreAllMocks();
  });

  it('spawns the package manager without a shell and with lifecycle scripts off', async () => {
    const { execFileSync } = await import('child_process');

    await add('bar-chart', { path: 'components' });

    expect(execFileSync).toHaveBeenCalledTimes(1);
    const [binary, args, opts] = execFileSync.mock.calls[0];

    expect(binary).toBe(process.platform === 'win32' ? 'npm.cmd' : 'npm');
    expect(args[0]).toBe('install');
    expect(args[1]).toBe('--ignore-scripts');
    expect(args).toContain('@visx/shape');
    expect(opts.shell).toBe(false);
  });

  it('passes a dependency name as one literal argument, never a shell string', async () => {
    const { execFileSync } = await import('child_process');

    await add('bar-chart', { path: 'components' });

    const [, args] = execFileSync.mock.calls[0];
    // Every argument is a whole package name. Under the old execSync the whole
    // command was one joined string, which is where a metacharacter in a name
    // would have become shell syntax.
    for (const arg of args.slice(2)) {
      expect(arg).not.toMatch(/[;&|`$<>(){}\s]/);
    }
  });
});
