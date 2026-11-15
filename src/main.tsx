import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { AppProviders } from './AppProviders';
import { AppRouter } from './AppRouter';

// The transport turns every failure into an error envelope, so retrying a query is not the default.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AppProviders>
                <AppRouter />
            </AppProviders>
        </QueryClientProvider>
    </StrictMode>,
);
