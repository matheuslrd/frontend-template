import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { backendRequest } from './backend-request';

const MOCK_FETCH = vi.fn();

const makeJsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('backendRequest', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', MOCK_FETCH);
        vi.stubEnv('VITE_API_URL', 'https://api.test');
        MOCK_FETCH.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it('requests the route under the API URL with the defined params', async () => {
        MOCK_FETCH.mockResolvedValue(makeJsonResponse({ success: true }));

        await backendRequest.get('/tasks', { params: { status: 'open', page: undefined } });

        expect(MOCK_FETCH).toHaveBeenCalledWith('https://api.test/tasks?status=open', expect.anything());
    });

    it('sends the body as JSON', async () => {
        MOCK_FETCH.mockResolvedValue(makeJsonResponse({ success: true }));

        await backendRequest.post('/tasks', { title: 'A' });

        expect(MOCK_FETCH).toHaveBeenCalledWith(
            'https://api.test/tasks',
            expect.objectContaining({
                method: 'POST',
                body: '{"title":"A"}',
                headers: { 'Content-Type': 'application/json' },
            }),
        );
    });

    it('returns the success envelope', async () => {
        MOCK_FETCH.mockResolvedValue(makeJsonResponse({ success: true, data: [1] }));

        await expect(backendRequest.get('/tasks')).resolves.toEqual({ success: true, data: [1] });
    });

    it('returns the backend error envelope on a 422', async () => {
        MOCK_FETCH.mockResolvedValue(makeJsonResponse({ success: false, msg: 'Title is required' }, 422));

        await expect(backendRequest.post('/tasks', {})).resolves.toEqual({
            success: false,
            msg: 'Title is required',
        });
    });

    it('turns a non-JSON error response into an exception', async () => {
        MOCK_FETCH.mockResolvedValue(new Response('<html>', { status: 502 }));

        await expect(backendRequest.get('/tasks')).resolves.toEqual({
            success: false,
            msg: 'HTTP 502',
            error: { name: 'HttpError', code: '502' },
        });
    });

    it('turns a network failure into an exception instead of rejecting', async () => {
        MOCK_FETCH.mockRejectedValue(new TypeError('Failed to fetch'));

        await expect(backendRequest.get('/tasks')).resolves.toEqual({
            success: false,
            msg: 'Failed to fetch',
            error: { name: 'NetworkError', code: 'network_error' },
        });
    });
});
