import { vi, expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock next/headers for server components
vi.mock('next/headers', () => ({
  headers: () => new Map([['x-forwarded-for', '127.0.0.1']]),
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));
