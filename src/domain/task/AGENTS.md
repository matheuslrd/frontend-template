# Task domain

This domain is an example of the architecture, from the API to the page; it can be deleted together with the page, the dev mock and their registrations in `src/AppRouter.tsx` and `vite.config.ts`, all listed below.

## File map

| Path | Responsibility |
| --- | --- |
| `src/domain/task/task.type.ts` | `Task` namespace: `Status` and `Model`, shared by the whole domain |
| `src/domain/task/task.constant.ts` | `TASK_STATUS_LABELS`, the text shown for each status |
| `src/domain/task/api/task.keys.ts` | Hierarchical query keys (`all`, `lists`, `list`) |
| `src/domain/task/api/list-tasks.query.ts` | `GET /tasks`: `makeListTasksQueryOptions`, with `Params` in the key |
| `src/domain/task/api/create-task.query.ts` | `POST /tasks`: `makeCreateTaskMutationOptions`, `Body` derived from the model |
| `src/domain/task/api/delete-task.service.ts` | `DELETE /tasks/:taskId`: direct service, returns the whole `Response` |
| `src/domain/task/helpers/task.helper.ts` | `formatTaskCreatedAt`, pure and without React |
| `src/domain/task/helpers/task.helper.test.ts` | Unit test of the helper |
| `src/domain/task/hooks/useTaskActions.ts` | Create and remove: invalidation, notifications and the id being removed |
| `src/domain/task/components/list/TasksContainer.tsx` | Status filter, list query, loading and error states, opens the modal |
| `src/domain/task/components/list/TaskList.tsx` | Presentational table of tasks with the delete button |
| `src/domain/task/components/list/TasksContainer.browser.test.tsx` | Behavior tests with only the transport mocked |
| `src/domain/task/components/create/CreateTaskModal.tsx` | Modal with the one-field form that creates a task |
| `src/pages/tasks/Tasks.page.tsx` | Route page, mounts `TasksContainer` |
| `src/AppRouter.tsx` | Registration: the `/` redirect to `/tasks` and the `/tasks` route |
| `dev/mock-tasks-api.ts` | Dev-server plugin that serves `/api/tasks` from memory |
| `vite.config.ts` | Registration: the `mockTasksApi` import and its entry in `plugins` |

## Data flow

Page (`Tasks.page.tsx`) -> container (`TasksContainer`) -> `useQuery` with `makeListTasksQueryOptions` or `useTaskActions` -> operation in `api/` -> transport (`backendRequest`).

## Rules

- Invalidation and notification live in `useTaskActions`, not in `makeCreateTaskMutationOptions`: the factory only holds what every consumer needs.
- `deleteTask` is a direct service on purpose, to show the shape of an operation that does not use the cache; the hook checks the response with `hasServiceError`.
- The status filter is applied by the server: `status` is part of the query key and the list is never filtered on the client.
