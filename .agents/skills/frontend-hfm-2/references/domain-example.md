# The `task` domain, file by file

`src/domain/task` is the example every rule in `frontend-hfm-2` and `frontend-api` is checked against. Each entry says why the file is where it is. Marks are the ones used in `SKILL.md`: `(gate: ...)` fails a command, `(reviewer)` is judged.

## Domain root

### `src/domain/task/AGENTS.md`

The domain contract for agents: file map, data flow and the critical rules of this domain. Its opening paragraph also says the whole example can be deleted. A domain without this file fails `lint:structure`. (gate: lint:structure `domain-agents-md`)

### `src/domain/task/task.type.ts`

```ts
// src/domain/task/task.type.ts
export namespace Task {
    export type Status = 'open' | 'done';
    export type Model = { id: number, title: string, status: Status, createdAt: string };
}
```

The types shared by the whole domain, in a namespace named after the domain (reviewer). Components, hooks, operations, helpers and the dev mock all import it, so it sits at the root. The root only accepts `AGENTS.md` and `task.<kind>.ts` files. (gate: lint:structure `domain-root-files`)

### `src/domain/task/task.constant.ts`

`TASK_STATUS_LABELS` is the text shown for each status, typed as `Record<Task.Status, string>`. It is used by `TaskList.tsx` and by `TasksContainer.tsx`, so it belongs to the domain and not to one component. A module constant is written in `SCREAMING_SNAKE_CASE`. (reviewer)

## `api/`: the boundary with the backend

Only `*.query.ts`, `*.service.ts` and `*.keys.ts` live here, and nothing here has a test. (gate: lint:structure `api-folder-content`, `no-api-tests`)

| File | Why it is here |
| --- | --- |
| `api/task.keys.ts` | The key factory. It imports `Params` from `list-tasks.query.ts` as a type, so the key and the operation cannot drift. |
| `api/list-tasks.query.ts` | A read that uses the cache: it exports `makeListTasksQueryOptions`. `Params` is exported for the keys file; `Response` stays private. |
| `api/create-task.query.ts` | A write that uses `mutationOptions`. `Body = Pick<Task.Model, 'title'>` is derived from the model instead of retyped. |
| `api/delete-task.service.ts` | A write that does not touch the cache: it returns the whole `Response` and the caller checks it with `hasServiceError`. |

These are the only files of the domain that import `backend-request`. (gate: lint:structure `transport-outside-api`) The exact shape of each file is in `frontend-api`.

## `helpers/`

```ts
// src/domain/task/helpers/task.helper.ts
export const formatTaskCreatedAt = (createdAt: Task.Model['createdAt']): string =>
    dayjs(createdAt).format('DD/MM/YYYY');
```

A pure function with no React, named `*.helper.ts`. It lives in `helpers/` and not beside `TaskList.tsx` because the domain may reuse it. Its test, `task.helper.test.ts`, sits beside it and renders nothing, so it is a `.test.ts` that runs in the `unit` project. The parameter type is `Task.Model['createdAt']`, not `string`: the helper formats that field, not any string. (reviewer) The `*.helper.ts` name and the `helpers/` folder are checked. (gate: lint:structure `helpers-folder-content`)

## `hooks/`

`hooks/useTaskActions.ts` holds what the two components that act on tasks share: the create mutation with its notification, the delete with its error handling, the invalidation of the list queries, and the id being removed. It starts with `use`. (gate: lint:structure `hooks-folder-content`)

It is called from both `TasksContainer` and `CreateTaskModal`, but it is not a shared store: each call has its own `removingTaskId`. The modal only uses `createTask`. The consumption details are in `frontend-api`.

## `components/`

Subfolders are named after the flow: `list/` and `create/`. Each `.tsx` file exports a `function` or `const` named like the file, and the gate accepts either. (gate: lint:structure `tsx-outside-components`, `component-filename`) The components here are all `function` declarations. (reviewer)

| File | Why it is here |
| --- | --- |
| `components/list/TasksContainer.tsx` | The container of the list flow. It owns the status filter, runs the list query, picks the loading, error and success view, and opens the modal. |
| `components/list/TaskList.tsx` | Presentational: it gets `tasks`, `removingTaskId` and `onRemove` as props and renders the table. It knows nothing about queries. |
| `components/create/CreateTaskModal.tsx` | The create flow. It owns the form and calls `useTaskActions`. A `useRef` guard makes a fast double click send one request. |
| `components/list/TasksContainer.browser.test.tsx` | Behavior tests of the whole list flow, beside the container. It is `.browser.test.tsx` because it renders. (gate: lint:structure `component-test-browser-mode`) |

`TasksContainer.tsx` keeps the module constant `STATUS_FILTER_OPTIONS` and the `StatusFilter` type above the component, because only this file uses them (reviewer). `TaskList.tsx` builds `columns` inside the component because the columns close over `removingTaskId` and `onRemove`.

## `src/pages/tasks/Tasks.page.tsx`

Mounts `TasksContainer` and nothing else. (reviewer) `AppRouter.tsx` imports this page and nothing else of the domain. The file is a `*.page.tsx` in `src/pages`. (gate: lint:structure `pages-only-page-files`)

## Outside the domain

| File | Why it is here |
| --- | --- |
| `src/AppRouter.tsx` | Registers `/` (a redirect to `/tasks`) and `/tasks`. Deleting the example means removing both routes and the `Tasks` import. |
| `dev/mock-tasks-api.ts` | A Vite dev-server plugin that serves `/api/tasks` from memory in the `{ success, data }` envelope. It imports `Task` from the domain so the mock cannot drift from the type. It is not under `src` and never ships. |
| `vite.config.ts` | Registers `mockTasksApi()` in `plugins`. It imports the mock with the `.ts` extension, which `tsconfig.json` allows with `allowImportingTsExtensions`. |
| `src/test/render.tsx` | The render used by every browser test. See `frontend-api/references/testing.md`. |

## What the example does not have

No `@shared` code besides the HTTP transport, no second domain, no `components/<flow>/` helper beside its owner, and no `*.schema.ts`. When a new domain needs one of these, follow the table in `SKILL.md`.
