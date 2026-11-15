import { mutationOptions } from '@tanstack/react-query';

import { backendRequest } from '@domain/@shared/http/backend-request';
import { throwIfServiceError } from '@domain/@shared/http/service.helper';
import type { Service } from '@domain/@shared/http/service.type';

import type { Task } from '../task.type';

export type Body = Pick<Task.Model, 'title'>;

type Response =
    | Service.DefaultResponse<Task.Model, 'data'>
    | Service.ExceptionResponse;

/**
 * @service
 * @route /tasks
 * @http POST
 */
const createTask = async (body: Body): Promise<Task.Model> => {
    const response = await backendRequest.post<Response>('/tasks', body);

    throwIfServiceError(response);

    return response.data;
};

/** @factory */
export const makeCreateTaskMutationOptions = () => mutationOptions({
    mutationFn: createTask,
});
