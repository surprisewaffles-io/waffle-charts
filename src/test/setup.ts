import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

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
