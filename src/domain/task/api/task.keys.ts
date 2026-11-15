import type { Params as ListTasksParams } from './list-tasks.query';

export const taskQueryKeys = {
    all: ['tasks'] as const,
    lists: () => [...taskQueryKeys.all, 'list'] as const,
    list: (params: ListTasksParams) => [...taskQueryKeys.lists(), params] as const,
};
