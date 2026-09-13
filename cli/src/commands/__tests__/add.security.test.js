import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { add } from '../add.js';
import fs from 'fs-extra';
import prompts from 'prompts';
import { execSync } from 'child_process';

// Mock dependencies
vi.mock('fs-extra');
vi.mock('child_process');
vi.mock('prompts', () => ({
  default: vi.fn()
}));
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis()
  }))
}));

describe('add command - path traversal security', () => {
  let exitSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Mock process.exit to throw instead of exiting
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });

    // Spy on console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock fs operations
    fs.existsSync.mockReturnValue(true);
    fs.mkdirpSync.mockImplementation(() => {});
    fs.copyFileSync.mockImplementation(() => {});

    // Mock execSync
    execSync.mockImplementation(() => {});

    // existsSync is mocked true for every path, which includes the destination
    // file, so these path-validation cases would otherwise stall on the
    // overwrite prompt. Answer yes so the copy still happens.
    prompts.mockResolvedValue({ overwrite: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject path traversal with parent directory references (../../etc/passwd)', async () => {
    const maliciousPath = '../../etc/passwd';

    await expect(
      add('bar-chart', { path: maliciousPath })
    ).rejects.toThrow('process.exit(1)');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid path')
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(maliciousPath)
    );

    // Verify file operations were never called
    expect(fs.mkdirpSync).not.toHaveBeenCalled();
    expect(fs.copyFileSync).not.toHaveBeenCalled();
  });

  it('should reject absolute paths (/etc/passwd)', async () => {
    const maliciousPath = '/etc/passwd';

    await expect(
      add('bar-chart', { path: maliciousPath })
    ).rejects.toThrow('process.exit(1)');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid path')
    );

    // Verify file operations were never called
    expect(fs.mkdirpSync).not.toHaveBeenCalled();
    expect(fs.copyFileSync).not.toHaveBeenCalled();
  });

  it('should reject null byte injection (components\\x00/../../etc)', async () => {
    const maliciousPath = 'components\x00/../../etc';

    await expect(
      add('bar-chart', { path: maliciousPath })
    ).rejects.toThrow('process.exit(1)');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('illegal characters')
    );

    // Verify file operations were never called
    expect(fs.mkdirpSync).not.toHaveBeenCalled();
    expect(fs.copyFileSync).not.toHaveBeenCalled();
  });

  it('should accept valid relative paths (components/Button)', async () => {
    const validPath = 'components/Button';

    // This should not throw
    await add('bar-chart', { path: validPath });

    // Verify exit was not called
    expect(exitSpy).not.toHaveBeenCalled();

    // Verify file operations were called (meaning path was accepted)
    expect(fs.copyFileSync).toHaveBeenCalled();
  });

  it('should accept valid nested relative paths (src/components/charts)', async () => {
    const validPath = 'src/components/charts';

    // This should not throw
    await add('bar-chart', { path: validPath });

    // Verify exit was not called
    expect(exitSpy).not.toHaveBeenCalled();

    // Verify file operations were called
    expect(fs.copyFileSync).toHaveBeenCalled();
  });

  it('should reject paths starting with .. even without slash (..config)', async () => {
    const maliciousPath = '..config';

    await expect(
      add('bar-chart', { path: maliciousPath })
    ).rejects.toThrow('process.exit(1)');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid path')
    );
  });

  it('should accept single-level directory names (components)', async () => {
    const validPath = 'components';

    // This should not throw
    await add('bar-chart', { path: validPath });

    // Verify exit was not called
    expect(exitSpy).not.toHaveBeenCalled();

    // Verify file operations were called
    expect(fs.copyFileSync).toHaveBeenCalled();
  });
});
