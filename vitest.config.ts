import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts', 'scripts/**/*.spec.mjs'],
    exclude: ['src/app/app.spec.ts']
  }
});
