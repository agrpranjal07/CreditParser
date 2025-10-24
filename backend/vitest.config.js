import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Remove global setup - let each test file handle its own mocking
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks', // Ensure tests run in isolation
    poolOptions: {
      forks: {
        singleFork: true // Run tests sequentially to avoid database conflicts
      }
    },
    env: {
      NODE_ENV: 'test'
    }
  },
});
