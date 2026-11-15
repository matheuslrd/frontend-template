import { App, ConfigProvider } from 'antd';
import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <ConfigProvider>
            <App>{children}</App>
        </ConfigProvider>
    );
}
