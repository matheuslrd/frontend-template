import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { backendRequest } from '@domain/@shared/http/backend-request';
import { render } from '@test/render';

import type { Task } from '../../task.type';

import { TasksContainer } from './TasksContainer';

vi.mock('@domain/@shared/http/backend-request', () => ({
    backendRequest: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const TASK_A = {
    id: 1,
    title: 'Write the report',
    status: 'open',
    createdAt: '2026-03-05T12:00:00.000Z',
} satisfies Task.Model;

const fillNewTaskForm = async () => {
    await userEvent.click(page.getByRole('button', { name: 'New task' }));
    await userEvent.fill(page.getByLabelText('Title'), 'Write the report');
};

describe('TasksContainer', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('shows the tasks the backend returns', async () => {
        vi.mocked(backendRequest.get).mockResolvedValue({ success: true, data: [TASK_A] });

        await render(<TasksContainer />);

        const row = page.getByRole('row', { name: /Write the report/ });
        await expect.element(row.getByText('Write the report')).toBeVisible();
        await expect.element(row.getByText('Open')).toBeVisible();
        await expect.element(row.getByText('05/03/2026')).toBeVisible();
    });

    it('shows the empty state for an empty list', async () => {
        vi.mocked(backendRequest.get).mockResolvedValue({ success: true, data: [] });

        await render(<TasksContainer />);

        await expect.element(page.getByText('No tasks yet')).toBeVisible();
    });

    it('shows the backend message when the list fails', async () => {
        vi.mocked(backendRequest.get).mockResolvedValue({ success: false, msg: 'Service unavailable' });

        await render(<TasksContainer />);

        await expect.element(page.getByText('Service unavailable')).toBeVisible();
    });

    it('asks the backend for the selected status', async () => {
        vi.mocked(backendRequest.get).mockImplementation(async (_route, options) => ({
            success: true,
            data: options?.params?.status === 'done' ? [] : [TASK_A],
        }));
        await render(<TasksContainer />);
        await expect.element(page.getByText('Write the report')).toBeVisible();

        await userEvent.click(page.getByText('Done', { exact: true }));

        await expect.element(page.getByText('No tasks yet')).toBeVisible();
        await expect.element(page.getByText('Write the report')).not.toBeInTheDocument();
    });

    it('creates a task and shows it in the list', async () => {
        vi.mocked(backendRequest.get)
            .mockResolvedValueOnce({ success: true, data: [] })
            .mockResolvedValueOnce({ success: true, data: [TASK_A] });
        vi.mocked(backendRequest.post).mockResolvedValue({ success: true, data: TASK_A });
        await render(<TasksContainer />);

        await fillNewTaskForm();
        await userEvent.click(page.getByRole('button', { name: 'Create' }));

        await expect.element(page.getByText('Write the report')).toBeVisible();
        expect(backendRequest.post).toHaveBeenCalledWith('/tasks', { title: 'Write the report' });
    });

    it('sends a single request when create is clicked twice', async () => {
        const resolvers: Array<(response: unknown) => void> = [];
        vi.mocked(backendRequest.get).mockResolvedValue({ success: true, data: [] });
        vi.mocked(backendRequest.post).mockReturnValue(new Promise((resolve) => resolvers.push(resolve)));
        await render(<TasksContainer />);

        await fillNewTaskForm();
        await userEvent.dblClick(page.getByRole('button', { name: 'Create' }));
        resolvers.forEach((resolve) => resolve({ success: true, data: TASK_A }));

        // The list is fetched again once the creation completes, so every click has been handled by then.
        await vi.waitFor(() => {
            expect(backendRequest.post).toHaveBeenCalledTimes(1);
            expect(backendRequest.get).toHaveBeenCalledTimes(2);
        });
    });

    it('shows the backend message when create fails', async () => {
        vi.mocked(backendRequest.get).mockResolvedValue({ success: true, data: [] });
        vi.mocked(backendRequest.post).mockResolvedValue({ success: false, msg: 'Title is taken' });
        await render(<TasksContainer />);

        await fillNewTaskForm();
        await userEvent.click(page.getByRole('button', { name: 'Create' }));

        await expect.element(page.getByText('Title is taken')).toBeVisible();
        await expect.element(page.getByRole('dialog')).toBeVisible();
        // The busy button is named "loading Create": it must go idle right away, not when the toast closes.
        await expect.element(page.getByRole('button', { name: 'Create' }), { timeout: 500 }).toBeVisible();
    });

    it('requires a title', async () => {
        vi.mocked(backendRequest.get).mockResolvedValue({ success: true, data: [] });
        await render(<TasksContainer />);

        await userEvent.click(page.getByRole('button', { name: 'New task' }));
        await userEvent.click(page.getByRole('button', { name: 'Create' }));

        await expect.element(page.getByText('Title is required')).toBeVisible();
        expect(backendRequest.post).not.toHaveBeenCalled();
    });

    it('keeps the task and shows the backend message when delete fails', async () => {
        vi.mocked(backendRequest.get).mockResolvedValue({ success: true, data: [TASK_A] });
        vi.mocked(backendRequest.delete).mockResolvedValue({ success: false, msg: 'Task is locked' });
        await render(<TasksContainer />);

        await userEvent.click(page.getByRole('button', { name: 'Delete Write the report' }));

        await expect.element(page.getByText('Task is locked')).toBeVisible();
        await expect.element(page.getByText('Write the report')).toBeVisible();
    });
});
