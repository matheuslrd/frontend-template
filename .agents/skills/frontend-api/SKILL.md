---
name: frontend-api
description: How HTTP operations are written and consumed in this app: `.query.ts` and `.service.ts` files, the `backendRequest` transport, query keys, `useQuery` and `useMutation` consumption, response types and the tests that cover them. Use when creating or changing any file in an `api/` folder, any query, mutation or query key, anything that calls the backend, or a test that mocks the backend.
---

# frontend-api

One way to talk to the backend: an operation file in `api/` calls `backendRequest`, and a component or hook consumes the operation. Where the files go is in `frontend-hfm-2`. Every example below is a real file of `src/domain/task`, cited by path.

Marks: `(gate: ...)` means a command fails on a violation, `(reviewer)` means the `code-conventions-reviewer` judges it.

## Choose the file type

| The operation | File | Exports | Handles the response |
| --- | --- | --- | --- |
| Takes part in the TanStack Query cache, or is a mutation | `<verb>-<noun>.query.ts` | `make<Name>QueryOptions` or `make<Name>MutationOptions` | validates with `throwIfServiceError`, returns the payload |
| Does not use the cache | `<verb>-<noun>.service.ts` | the request function | returns the whole `Response`; the caller uses `hasServiceError` |

- A `.query.ts` calls `queryOptions(`, `infiniteQueryOptions(` or `mutationOptions(`. A `.service.ts` calls none of them. If the file does not fit its suffix, rename it. (gate: lint:structure `operation-shape`)
- Every operation file carries a JSDoc block with `@route` and `@http`. The gate only looks for both tags in the file; the reviewer checks that they describe the function. (gate: lint:structure `operation-route-jsdoc`)
- One operation per file. (reviewer)
- What each file type returns, as the last column says, is (reviewer): the `.query.ts` request function validates and returns the payload, and the `.service.ts` function returns the whole `Response`.

## Transport: `src/domain/@shared/http/`

| File | Holds |
| --- | --- |
| `backend-request.ts` | `backendRequest.get`, `delete`, `post`, `put`, `patch`. The only file that calls `fetch`. |
| `service.type.ts` | The `Service` namespace: `DefaultResponse<TPayload, TKey>`, `ExceptionResponse`, `Message`. |
| `service.helper.ts` | `hasServiceError`, `throwIfServiceError` and the `ServiceError` class. |

**The transport never rejects.** Every failure becomes a `Service.ExceptionResponse`:

- A body with a `success` key is returned as it came, whatever the HTTP status (a 422 with `{ success: false, msg }` arrives as that object).
- A body without it becomes `{ success: false, msg: 'HTTP <status>', error: { name: 'HttpError', code: '<status>' } }`.
- A network failure becomes `error: { name: 'NetworkError', code: 'network_error' }`, with the error message in `msg`.

So a caller never wraps an operation in `try`/`catch`. (gate: lint:eslint `no-restricted-syntax`)

- The URL is `import.meta.env.VITE_API_URL` plus the route (typed in `src/vite-env.d.ts`, `/api` in `.env`). Params with an `undefined` value are dropped. A body is sent as JSON.
- `Service.DefaultResponse<Task.Model[], 'data'>` is `{ success: true, data: Task.Model[] }`: the second argument is the key that carries the payload. Without arguments it is `{ success: true }`.
- `throwIfServiceError(response)` narrows to the success type or throws a `ServiceError` whose `message` is the backend `msg`. `hasServiceError(response)` is the type guard for code that handles the failure itself.
- Only `backend-request.ts` uses `fetch`, `window.fetch` or `globalThis.fetch`. (gate: lint:eslint `no-restricted-globals`, `no-restricted-properties`)
- Only files in `api/`, tests and `@shared/http` import `backend-request`. (gate: lint:structure `transport-outside-api`)

## Query operation

```ts
// src/domain/task/api/list-tasks.query.ts
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
```

- The request function is private. It calls the transport with a `Response` type, calls `throwIfServiceError`, and returns only the payload. (reviewer)
- The JSDoc has `@service`, `@route` with the path, and `@http` with the method. The gate checks that `@route` and `@http` are present. (gate: lint:structure `operation-route-jsdoc`) The `@service` tag, and `/** @factory */` on the exported factory, are (reviewer).
- `Params` is exported because the keys file needs it. `Response` stays private. (reviewer)

## Mutation operation

```ts
// src/domain/task/api/create-task.query.ts
export type Body = Pick<Task.Model, 'title'>;
```

```ts
// src/domain/task/api/create-task.query.ts
/** @factory */
export const makeCreateTaskMutationOptions = () => mutationOptions({
    mutationFn: createTask,
});
```

The request function follows the same shape as the query: private, `throwIfServiceError`, returns `response.data`. `Body` is derived from the model with `Pick`, not retyped. The factory holds only what every consumer needs, which is `mutationFn`. Notifications and invalidation are the consumer's. (reviewer)

## Direct service

```ts
// src/domain/task/api/delete-task.service.ts
export type Response = Service.DefaultResponse | Service.ExceptionResponse;

/**
 * @service
 * @route /tasks/:taskId
 * @http DELETE
 */
export const deleteTask = (taskId: Task.Model['id']): Promise<Response> =>
    backendRequest.delete<Response>(`/tasks/${taskId}`);
```

It exports the function and its `Response`, and neither validates nor unwraps. The consumer handles failure with `hasServiceError`. (reviewer)

## Query keys

```ts
// src/domain/task/api/task.keys.ts
export const taskQueryKeys = {
    all: ['tasks'] as const,
    lists: () => [...taskQueryKeys.all, 'list'] as const,
    list: (params: ListTasksParams) => [...taskQueryKeys.lists(), params] as const,
};
```

- One keys file per domain, hierarchical, with an `all` prefix. Invalidate by prefix: `taskQueryKeys.lists()` refreshes every filter. (reviewer)
- Every variable the `queryFn` uses is in the key. (gate: lint:eslint `@tanstack/query/exhaustive-deps`)

## Consuming operations

A query is read with `useQuery` and the factory:

```tsx
// src/domain/task/components/list/TasksContainer.tsx
const { data, error, isError, isPending, isSuccess } = useQuery(makeListTasksQueryOptions({ status }));
```

A mutation is spread into `useMutation`, and the effects of the flow are added by the consumer:

```ts
// src/domain/task/hooks/useTaskActions.ts
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
```

A `useMutation` callback that calls `message.success()` or `message.error()` uses a block body, so it returns nothing. (reviewer) Those calls return a thenable, and TanStack Query awaits whatever the callback returns. An arrow with an expression body would keep the mutation pending until the toast closes. The `await` on `invalidateQueries` is the opposite case: the mutation stays pending until the list is fetched again, and the callbacks passed to `mutate` run after that.

A direct service is called by the hook, which checks the envelope:

```ts
// src/domain/task/hooks/useTaskActions.ts
const response = await deleteTask(taskId);

if (hasServiceError(response)) {
    setRemovingTaskId(null);
    message.error(response.msg ?? 'Could not delete the task');
    return;
}
```

- `useTaskActions()` is called in both `TasksContainer` and `CreateTaskModal`. It is not a shared store: each call has its own `removingTaskId`.
- The production `QueryClient` in `src/main.tsx` sets `retry: false` for queries, because the transport turns every failure into an error envelope. Retrying is opt-in: a query that should retry says so in its own factory. (reviewer)
- The effect of a flow (notification, invalidation) lives in the consumer, not in the factory. (reviewer)

## State rules

- Loading, error and success views come from the query state: `isPending`, `isError`, `isSuccess`, `error.message`. (reviewer)
- Query data is never copied into `useState`. `TasksContainer` keeps only UI state in `useState` (the filter and the modal flag), and the filter is in the key. (reviewer)
- A filter the server applies is a query parameter, so it is part of the key. The list is not filtered again on the client. (gate for the key: lint:eslint `@tanstack/query/exhaustive-deps`; reviewer for the client filter)
- `isPending` alone does not stop a fast double click: it renders a tick after the click. `CreateTaskModal` also uses a `useRef` guard, so a real double click sends one POST. (reviewer)

```tsx
// src/domain/task/components/create/CreateTaskModal.tsx
const handleFinish = (values: CreateTaskBody) => {
    if (isSubmitting.current)
        return;

    isSubmitting.current = true;
    createTask.mutate(values, {
        onSuccess: onClose,
        onSettled: () => {
            isSubmitting.current = false;
        },
    });
};
```

## Types and Zod

The hand-written type is the contract: `Task.Model` in `task.type.ts`, and `Body`, `Params` and `Response` in the operation file. `zod` is not installed in this template. If you add it, write the type by hand and tie the schema to it with `satisfies z.ZodType<Task.Model>`. (reviewer) Do not derive the type with `z.infer`. (gate: lint:eslint `no-restricted-syntax`)

## Tests

- An operation has no test file of its own. The component or hook that uses it is tested instead. (gate: lint:structure `no-api-tests`)
- A test that renders a component is `*.browser.test.tsx`. (gate: lint:structure `component-test-browser-mode`, which rejects `.test.tsx`) A hook test is also `*.browser.test.tsx`; a `.test.ts` that calls `renderHook` passes the gate. (reviewer)
- The test mocks the transport module and renders with a new `QueryClient` per test. It never mocks `useQuery` or `useMutation`, and it asserts what the user sees. (reviewer)

How to write them, with `TasksContainer.browser.test.tsx` as the example: `references/testing.md`.
