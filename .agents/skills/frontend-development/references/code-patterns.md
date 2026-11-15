# Code patterns

Concrete shapes for the rules in `SKILL.md`. Every code block is an excerpt of a real file, cited by path. Wrong forms are described in words, never shown as code. Marks: `(gate: ...)` means a command fails on a violation, `(reviewer)` means the `code-conventions-reviewer` judges it.

## Control flow and conditional rendering

**Return early.** A guard that fails leaves the function. There is no `else`. (gate: lint:eslint `no-restricted-syntax`)

```ts
// src/domain/task/hooks/useTaskActions.ts
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
```

**Braces.** A body of one short statement has no braces, and the statement goes on the next line. A body of several statements has braces. A one-statement body that spans several lines, or is itself an `if`, also gets braces. (gate: lint:oxlint `curly`; lint:eslint `@stylistic/nonblock-statement-body-position`)

```ts
// src/domain/task/components/create/CreateTaskModal.tsx
if (isSubmitting.current)
    return;
```

**A lookup, not a `switch`.** (gate: lint:eslint `no-restricted-syntax`)

```ts
// src/domain/task/task.constant.ts
export const TASK_STATUS_LABELS: Record<Task.Status, string> = {
    open: 'Open',
    done: 'Done',
};
```

```tsx
// src/domain/task/components/list/TaskList.tsx
render: (status: Task.Status) => <Tag>{TASK_STATUS_LABELS[status]}</Tag>,
```

**`const` and derived values.** Compute a value from others in one expression, not by reassigning. (gate: lint:eslint `no-restricted-syntax`)

```ts
// src/domain/@shared/http/backend-request.ts
const queryString = query.toString();
const base = `${import.meta.env.VITE_API_URL}${route}`;
return queryString === '' ? base : `${base}?${queryString}`;
```

**Errors.** There is no `try`. The transport never rejects, so an operation needs no handler; `.catch()` is allowed for a promise you must turn into a value. (gate: lint:eslint `no-restricted-syntax`)

```ts
// src/domain/@shared/http/backend-request.ts
const body: unknown = await response.json().catch(() => undefined);
```

**Conditional rendering.** A ternary with `null`, never `&&`. (gate: lint:eslint `no-restricted-syntax`)

```tsx
// src/domain/task/components/list/TasksContainer.tsx
{isPending ? <Skeleton active /> : null}
{isError ? <Result status="error" title={error.message} /> : null}
{isSuccess ? <TaskList tasks={data} removingTaskId={removingTaskId} onRemove={removeTask} /> : null}
```

**Values.** Use `??` for a default and an explicit comparison for a choice. (gate: lint:oxlint `typescript/prefer-nullish-coalescing`, and `typescript/strict-boolean-expressions` for nullable values; reviewer for the rest)

```tsx
// src/domain/task/components/list/TasksContainer.tsx
value={status ?? 'all'}
onChange={(value) => setStatus(value === 'all' ? undefined : value)}
```

Keep block nesting at 2 or less. When a third level appears, return early or extract a function. (gate: lint:oxlint `max-depth`)

## Structure of a `.tsx` file

Order, top to bottom:

1. Imports. The gate sorts them into groups separated by a blank line: `react` and other packages, side-effect imports, the `@domain`, `@pages` and `@test` aliases, `..` paths, then `./` paths. (gate: lint:eslint `simple-import-sort/imports`)
2. Types: the `Props` type and local types. (reviewer)
3. Module constants and helpers, in `SCREAMING_SNAKE_CASE` for the constants. (reviewer)
4. Subcomponents, each a function with its own `Props`, above the main component. Move one to its own file when another file needs it. (reviewer)
5. The main component, exported by name (gate: lint:oxlint `import/no-default-export`) and declared as a `function`. (reviewer)

```tsx
// src/domain/task/hooks/useTaskActions.ts
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';

import { hasServiceError } from '@domain/@shared/http/service.helper';

import { makeCreateTaskMutationOptions } from '../api/create-task.query';
```

```tsx
// src/domain/task/components/list/TasksContainer.tsx
type StatusFilter = Task.Status | 'all';

const STATUS_FILTER_OPTIONS: SegmentedProps<StatusFilter>['options'] = [
    { label: 'All', value: 'all' },
    { label: TASK_STATUS_LABELS.open, value: 'open' },
    { label: TASK_STATUS_LABELS.done, value: 'done' },
];

export function TasksContainer() {
```

The props type is named `Props`, with members separated by commas. (reviewer for the name; gate: lint:eslint `@stylistic/member-delimiter-style` for the commas)

```tsx
// src/domain/task/components/create/CreateTaskModal.tsx
type Props = {
    isOpen: boolean,
    onClose: () => void,
};
```

Inside the component, the order is hooks, then derived values, then handlers, then the returned JSX. (reviewer)

```tsx
// src/domain/task/components/create/CreateTaskModal.tsx
export function CreateTaskModal({ isOpen, onClose }: Props) {
    const [form] = Form.useForm<CreateTaskBody>();
    const { createTask } = useTaskActions();
    // `isPending` only renders a tick after the click, so a fast double click would still submit twice.
    const isSubmitting = useRef(false);

    const handleFinish = (values: CreateTaskBody) => {
```

Do not write a `renderXxx` function that returns JSX. Extract a component, so it has its own props and can be read on its own. (reviewer) The columns in `TaskList.tsx` are built inside the component because they close over props; a function that captures nothing from its parent moves to module level. (gate: lint:oxlint `unicorn/consistent-function-scoping`)

## Building objects

Write the object in one literal. Do not spread a conditional fragment into it. When the receiver ignores `undefined`, pass the key with a value that may be `undefined`. (reviewer)

`TasksContainer` passes `{ status }` to `makeListTasksQueryOptions` whether or not a status is selected. The transport drops undefined params, so the call site has no condition:

```ts
// src/domain/@shared/http/backend-request.ts
Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined)
        query.set(key, String(value));
});
```

Spreading a whole object is fine. (reviewer) The hook adds its flow callbacks on top of the factory options:

```ts
// src/domain/task/hooks/useTaskActions.ts
const createTask = useMutation({
    ...makeCreateTaskMutationOptions(),
```

The transport builds the `fetch` arguments the same way: `body` and `headers` are each computed with a ternary that yields `undefined` when there is no body, so a bodiless request sends neither.

```ts
// src/domain/@shared/http/backend-request.ts
body: body === undefined ? undefined : JSON.stringify(body),
headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
```

## Comments

Write a comment only for a decision the code cannot show: why a form was chosen, what would break with the obvious form. One line, in English, about the reason and not about what the line does. No commented-out code. (reviewer)

```ts
// src/domain/task/components/create/CreateTaskModal.tsx
// `isPending` only renders a tick after the click, so a fast double click would still submit twice.
const isSubmitting = useRef(false);
```

```ts
// src/domain/@shared/http/service.helper.ts
// Must stay a `function` declaration: assertion signatures need an explicitly typed callee (TS2775).
export function throwIfServiceError<TResponse extends { success: boolean }>(
```

```ts
// src/main.tsx
// The transport turns every failure into an error envelope, so retrying a query is not the default.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
```

Operations carry a JSDoc block with `@service`, `@route` and `@http`, and their factory carries `/** @factory */`. The gate checks that `@route` and `@http` are present. (gate: lint:structure `operation-route-jsdoc`) The `@service` tag and `/** @factory */` are (reviewer). See `frontend-api`.

A comment that turns a rule off is a directive, with its own format. See `AGENTS.md`. (gate: lint:eslint `@eslint-community/eslint-comments/require-description`)
