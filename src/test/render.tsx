import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { render as renderInBrowser } from 'vitest-browser-react';
import { AppProviders } from '../AppProviders';

export const render = (component: ReactElement) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return renderInBrowser(
        <QueryClientProvider client={queryClient}>
            <AppProviders>{component}</AppProviders>
        </QueryClientProvider>,
    );
};
