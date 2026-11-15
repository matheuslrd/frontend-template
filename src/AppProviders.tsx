import type { ReactNode } from 'react';
import { App, ConfigProvider } from 'antd';

type Props = { children: ReactNode };

export function AppProviders({ children }: Props) {
    return (
        <ConfigProvider>
            <App>{children}</App>
        </ConfigProvider>
    );
}
