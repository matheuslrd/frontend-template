import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { Tasks } from '@pages/tasks/Tasks.page';

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/tasks" replace />} />
                <Route path="/tasks" element={<Tasks />} />
            </Routes>
        </BrowserRouter>
    );
}
