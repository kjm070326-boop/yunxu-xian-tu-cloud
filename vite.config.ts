import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
  build: { outDir: '../dist/client', emptyOutDir: true },
  test: { environment: 'jsdom', globals: true, setupFiles: './test/setup.ts', include: ['test/**/*.test.ts', '../test/**/*.test.ts', '../test/**/*.test.tsx'] },
});
