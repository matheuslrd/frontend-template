import { queryOptions } from '@tanstack/react-query';

import { backendRequest } from '@domain/@shared/http/backend-request';
import { throwIfServiceError } from '@domain/@shared/http/service.helper';
import type { Service } from '@domain/@shared/http/service.type';

import type { Task } from '../task.type';

import { taskQueryKeys } from './task.keys';

export type Params = { status?: Task.Status };

type Response =
    | Service.DefaultResponse<Task.Model[], 'data'>
    | Service.ExceptionResponse;

/**
 * @service
 * @route /tasks
 * @http GET
 */
const listTasks = async (params: Params): Promise<Task.Model[]> => {
    const response = await backendRequest.get<Response>('/tasks', { params });

    throwIfServiceError(response);

    return response.data;
};

/** @factory */
export const makeListTasksQueryOptions = (params: Params) => queryOptions({
    queryKey: taskQueryKeys.list(params),
    queryFn: () => listTasks(params),
});
