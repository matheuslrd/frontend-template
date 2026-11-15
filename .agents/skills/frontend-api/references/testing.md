# Testing operations through components

An operation in `api/` has no test file. It is covered by the component or hook that uses it, in a `*.browser.test.tsx` that mocks only the transport. `src/domain/task/components/list/TasksContainer.browser.test.tsx` is the example. Marks: `(gate: ...)` fails a command, `(reviewer)` is judged.

## The harness

```tsx
// src/test/render.tsx
export const render = (component: ReactElement) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return renderInBrowser(
        <QueryClientProvider client={queryClient}>
            <AppProviders>{component}</AppProviders>
        </QueryClientProvider>,
    );
};
```

- Import it as `@test/render`. (reviewer) Every call builds a new `QueryClient`, so no cache leaks between tests, and `retry: false` matches the production client.
- It wraps the component in `AppProviders` (the antd `ConfigProvider` and `App`). Components such as `useTaskActions` call `App.useApp()`, which needs that wrapper.
- It returns the `vitest-browser-react` result. Always `await render(...)`. (reviewer)
- `src/test/setup.browser.ts` loads the antd reset CSS for the `browser` project.
- `vite.config.ts` defines two Vitest projects. `unit` runs `src/**/*.test.ts` in happy-dom. `browser` runs `src/**/*.browser.test.tsx` in headless Chromium through Playwright. `npm run setup` downloads Chromium; `npm test` runs both.
- A test that renders a component is named `*.browser.test.tsx`. (gate: lint:structure `component-test-browser-mode`, which rejects `.test.tsx`) A hook test is named the same way; a `.test.ts` that calls `renderHook` passes the gate. (reviewer)

## Mock the transport, nothing above it

```tsx
// src/domain/task/components/list/TasksContainer.browser.test.tsx
vi.mock('@domain/@shared/http/backend-request', () => ({
    backendRequest: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
```

```tsx
// src/domain/task/components/list/TasksContainer.browser.test.tsx
beforeEach(() => {
    vi.resetAllMocks();
});
```

- The operations, the keys, `useQuery`, `useMutation` and `useTaskActions` run for real. Never mock `useQuery`, `useMutation` or an operation: the test would stop proving the key, the `throwIfServiceError` path and the invalidation. (reviewer)
- Answer with envelopes. Success is `{ success: true, data: [TASK_A] }`. Failure is `{ success: false, msg: 'Service unavailable' }`, and the test checks that the message is visible. (reviewer)
- Test data is a module constant checked against the domain type: `TASK_A = { ... } satisfies Task.Model`. (reviewer)
- `mockResolvedValue` answers every call. Chained `mockResolvedValueOnce` answers a sequence (the list before and after a create). `mockImplementation` answers by input. `mockReturnValue(new Promise(...))` holds a request open.

## Assert what the user sees

Assert the visible result. Never assert only the call your own mock set up: the mock was told what to answer, so checking that it was called proves nothing about the screen. (reviewer)

The status filter test is the pattern. The mock answers per status, and the test asserts the screen:

```tsx
// src/domain/task/components/list/TasksContainer.browser.test.tsx
vi.mocked(backendRequest.get).mockImplementation(async (_route, options) => ({
    success: true,
    data: options?.params?.status === 'done' ? [] : [TASK_A],
}));
await render(<TasksContainer />);
await expect.element(page.getByText('Write the report')).toBeVisible();

await userEvent.click(page.getByText('Done', { exact: true }));

await expect.element(page.getByText('No tasks yet')).toBeVisible();
await expect.element(page.getByText('Write the report')).not.toBeInTheDocument();
```

If the container stopped sending the status, the list would not empty and the test would fail. It does not need `toHaveBeenCalledWith`.

A call assertion is fine next to a visible result, or to prove that something did not happen. (reviewer) The create test checks that the task appears and then that the body sent was `{ title: 'Write the report' }`. The validation test checks that `post` was not called.

## What each `TasksContainer` test proves

| Test | Proves |
| --- | --- |
| shows the tasks the backend returns | row title, status label and date format reach the screen |
| shows the empty state for an empty list | the empty view |
| shows the backend message when the list fails | a failure envelope becomes a `ServiceError` message in the error view |
| asks the backend for the selected status | the status filter reaches the server, seen through a per-status mock |
| creates a task and shows it in the list | the mutation, the invalidation and the refetch, with `get` answering twice |
| sends a single request when create is clicked twice | the `useRef` guard in `CreateTaskModal` |
| shows the backend message when create fails | the toast, the open modal and a button that goes idle at once |
| requires a title | form validation, and that no request is sent |
| keeps the task and shows the backend message when delete fails | the direct service path with `hasServiceError` |

Two tests hold a request open or time a button, so read them before copying:

```tsx
// src/domain/task/components/list/TasksContainer.browser.test.tsx
const resolvers: Array<(response: unknown) => void> = [];
vi.mocked(backendRequest.get).mockResolvedValue({ success: true, data: [] });
vi.mocked(backendRequest.post).mockReturnValue(new Promise((resolve) => resolvers.push(resolve)));
```

```tsx
// src/domain/task/components/list/TasksContainer.browser.test.tsx
await userEvent.dblClick(page.getByRole('button', { name: 'Create' }));
resolvers.forEach((resolve) => resolve({ success: true, data: TASK_A }));

// The list is fetched again once the creation completes, so every click has been handled by then.
await vi.waitFor(() => {
    expect(backendRequest.post).toHaveBeenCalledTimes(1);
    expect(backendRequest.get).toHaveBeenCalledTimes(2);
});
```

The double-click test waits for the second list fetch because that is the last effect of the create flow. After it, any second POST would already have been sent. The create-failure test asserts the button is idle within 500 ms: an `onError` with an expression body would keep the mutation pending until the toast closes (see `frontend-api`).

## Other rules

- Find elements by role, label or text with `page.getByRole`, `page.getByLabelText` and `page.getByText`, and act with `userEvent` from `vitest/browser`. (reviewer)
- One case per behavior. Do not repeat a case another test proves, and do not assert a constant. (reviewer)
- A test sits beside the file it covers. Pure functions use `*.test.ts`: `task.helper.test.ts`, and the transport's `backend-request.test.ts`, the only test that stubs `fetch` and `VITE_API_URL`. (reviewer)
- `*.test.ts` and `*.browser.test.tsx` files have `typescript/strict-boolean-expressions`, `unicorn/consistent-function-scoping` and `react/jsx-filename-extension` turned off in `.oxlintrc.json`. Every other rule, in oxlint and ESLint, applies to them. (gate: lint:oxlint, lint:eslint)
