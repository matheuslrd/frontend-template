import { BrowserRouter, Route, Routes } from 'react-router';

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<p>Frontend template</p>} />
            </Routes>
        </BrowserRouter>
    );
}
