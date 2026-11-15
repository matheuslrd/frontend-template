import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

import type { Task } from '../src/domain/task/task.type';

const sendJson = (res: ServerResponse, statusCode: number, body: object) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
};

const readJson = async (req: IncomingMessage): Promise<unknown> => {
    const chunks: Buffer[] = [];
    for await (const chunk of req)
        chunks.push(chunk as Buffer);
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
};

/** Serves `/api/tasks` from memory so the app runs without a backend. Dev server only. */
export const mockTasksApi = (): Plugin => {
    const tasks: Task.Model[] = [
        { id: 1, title: 'Write the report', status: 'open', createdAt: '2026-03-05T12:00:00.000Z' },
        { id: 2, title: 'Review the pull request', status: 'open', createdAt: '2026-03-06T09:30:00.000Z' },
    ];

    return {
        name: 'mock-tasks-api',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use('/api/tasks', async (req, res, next) => {
                const url = new URL(req.url ?? '/', 'http://localhost');

                if (req.method === 'GET') {
                    const status = url.searchParams.get('status');
                    const data = status === null ? tasks : tasks.filter((task) => task.status === status);
                    return sendJson(res, 200, { success: true, data });
                }

                if (req.method === 'POST') {
                    const body = await readJson(req).catch(() => undefined);
                    if (typeof body !== 'object' || body === null)
                        return sendJson(res, 400, { success: false, msg: 'Invalid JSON body' });

                    const { title } = body as { title?: unknown };
                    if (typeof title !== 'string' || title.trim() === '')
                        return sendJson(res, 422, { success: false, msg: 'Title is required' });

                    const task: Task.Model = {
                        id: Math.max(0, ...tasks.map(({ id }) => id)) + 1,
                        title: title.trim(),
                        status: 'open',
                        createdAt: new Date().toISOString(),
                    };
                    tasks.push(task);
                    return sendJson(res, 200, { success: true, data: task });
                }

                if (req.method === 'DELETE') {
                    // The mount path is already stripped from req.url, so the pathname is '/<id>'.
                    const index = tasks.findIndex(({ id }) => id === Number(url.pathname.slice(1)));
                    if (index === -1)
                        return sendJson(res, 404, { success: false, msg: 'Task not found' });

                    tasks.splice(index, 1);
                    return sendJson(res, 200, { success: true });
                }

                return next();
            });
        },
    };
};
