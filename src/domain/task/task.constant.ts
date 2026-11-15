import type { Task } from './task.type';

export const TASK_STATUS_LABELS: Record<Task.Status, string> = {
    open: 'Open',
    done: 'Done',
};
