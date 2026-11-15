import { backendRequest } from '@domain/@shared/http/backend-request';
import type { Service } from '@domain/@shared/http/service.type';

import type { Task } from '../task.type';

export type Response = Service.DefaultResponse | Service.ExceptionResponse;

/**
 * @service
 * @route /tasks/:taskId
 * @http DELETE
 */
export const deleteTask = (taskId: Task.Model['id']): Promise<Response> =>
    backendRequest.delete<Response>(`/tasks/${taskId}`);
