import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// The .ts extension keeps Vite's native config loader from warning about an extensionless import.
import { mockTasksApi } from './dev/mock-tasks-api.ts';

export default defineConfig({
    plugins: [react(), mockTasksApi()],
    resolve: { tsconfigPaths: true },
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    include: ['src/**/*.test.ts'],
                    environment: 'happy-dom',
                },
            },
            {
                extends: true,
                test: {
                    name: 'browser',
                    include: ['src/**/*.browser.test.tsx'],
                    setupFiles: ['./src/test/setup.browser.ts'],
                    browser: {
                        enabled: true,
                        provider: playwright(),
                        headless: true,
                        instances: [{ browser: 'chromium' }],
                    },
                },
            },
        ],
    },
});
