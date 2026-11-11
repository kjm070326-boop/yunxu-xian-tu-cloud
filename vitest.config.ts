import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], test: { environment: 'jsdom', globals: true, setupFiles: './client/test/setup.ts', include: ['client/test/**/*.test.ts', 'client/test/**/*.test.tsx', 'test/**/*.test.ts', 'test/**/*.test.tsx'] } });
