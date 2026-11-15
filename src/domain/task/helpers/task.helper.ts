import dayjs from 'dayjs';

import type { Task } from '../task.type';

export const formatTaskCreatedAt = (createdAt: Task.Model['createdAt']): string =>
    dayjs(createdAt).format('DD/MM/YYYY');
