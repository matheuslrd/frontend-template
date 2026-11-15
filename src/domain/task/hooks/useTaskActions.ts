import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';

import { hasServiceError } from '@domain/@shared/http/service.helper';

import { makeCreateTaskMutationOptions } from '../api/create-task.query';
import { deleteTask } from '../api/delete-task.service';
import { taskQueryKeys } from '../api/task.keys';
import type { Task } from '../task.type';

export function useTaskActions() {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [removingTaskId, setRemovingTaskId] = useState<Task.Model['id'] | null>(null);

    const createTask = useMutation({
        ...makeCreateTaskMutationOptions(),
        // A block body: `message.error()` returns a thenable that TanStack would await until the toast closes.
        onError: (error) => {
            message.error(error.message);
        },
        onSuccess: async () => {
            message.success('Task created');
            await queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        },
    });

    const removeTask = async (taskId: Task.Model['id']) => {
        setRemovingTaskId(taskId);
        const response = await deleteTask(taskId);

        if (hasServiceError(response)) {
            setRemovingTaskId(null);
            message.error(response.msg ?? 'Could not delete the task');
            return;
        }

        await queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        setRemovingTaskId(null);
    };

    return { createTask, removeTask, removingTaskId };
}
