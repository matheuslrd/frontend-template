---
name: frontend-hfm-2
description: Where each file goes in this app's domain architecture (HFM 2). Use when creating, moving, renaming or choosing the owner of any file under src/domain or src/pages, when opening a new domain, or when `npm run lint:structure` reports a violation.
---

# frontend-hfm-2

Every file has one owner: a domain (`src/domain/<domain>/`), the shared area (`src/domain/@shared/`) or a route page (`src/pages/<route>/`). This skill says which one. The shape of an HTTP operation is in `frontend-api`. The style of component code is in `frontend-development`. `references/domain-example.md` walks through `src/domain/task`, the working example.

Every rule ends with a mark. `(gate: ...)` means a command fails on a violation; for `lint:structure` the id is the rule id printed by `scripts/check-structure.mjs`. `(reviewer)` means no command checks it and the `code-conventions-reviewer` judges it.

## Structure

```text
src/
  main.tsx, AppProviders.tsx, AppRouter.tsx
  domain/
    @shared/                      generic code and local infrastructure, no business owner
      http/
        backend-request.ts        the only file that calls fetch
        service.type.ts           namespace Service
        service.helper.ts         hasServiceError, throwIfServiceError, ServiceError
    <domain>/
      AGENTS.md                   the domain contract for agents
      <domain>.type.ts            namespace with the domain contracts
      <domain>.constant.ts
      api/
        <domain>.keys.ts          query key factory
        <operation>.query.ts      exports a queryOptions / mutationOptions factory
        <operation>.service.ts    exports a direct request function
      components/                 PascalCase.tsx; subfolders per flow
      helpers/                    *.helper.ts reused in the domain, no React
      hooks/                      use*.ts reused in the domain
  pages/<route>/                  only *.page.tsx
  test/                           Vitest setup and render
```

- Create a folder only when it holds a file. (reviewer)
- Across areas, import with the aliases `@domain/*`, `@pages/*` and `@test/*`. Inside a domain, import with relative paths. (reviewer)

## Concern to placement

| Concern | Goes in | Mark |
| --- | --- | --- |
| Types of the whole domain (`Task.Model`, `Task.Status`) | `<domain>.type.ts`, one `namespace` named after the domain | (reviewer) |
| Contract of one operation (`Body`, `Params`, `Response`) | the operation file in `api/` | (reviewer) |
| Domain constants | `<domain>.constant.ts`. The gate only checks that a root file is named `<domain>.<kind>.ts`; a constants file elsewhere passes it | (reviewer) |
| Anything else at the domain root | nowhere: the root holds only `AGENTS.md` and `<domain>.<kind>.ts` | (gate: lint:structure `domain-root-files`) |
| Query key factory | `api/<domain>.keys.ts` | (gate: lint:structure `api-folder-content`, `api-suffix-outside-api`) |
| Operation that uses the cache | `api/<operation>.query.ts` | (gate: lint:structure `operation-shape`) |
| Operation that does not | `api/<operation>.service.ts` | (gate: lint:structure `operation-shape`) |
| Pure function reused in the domain | `helpers/<name>.helper.ts` | (gate: lint:structure `helpers-folder-content`) |
| Hook reused in the domain | `hooks/use<Name>.ts` | (gate: lint:structure `hooks-folder-content`) |
| Component file | `components/[<flow>/]<Name>.tsx`; the file exports `<Name>` as a `function` or a `const`, and the gate accepts either | (gate: lint:structure `tsx-outside-components`, `component-filename`) |
| Component declaration | the main component is `export function <Name>` | (reviewer) |
| Type, helper or hook of one component or flow | beside its owner in `components/<flow>/` | (reviewer) |
| Code used by more than one domain | `src/domain/@shared/` | (reviewer) |
| Route page | `src/pages/<route>/<Name>.page.tsx` | (gate: lint:structure `pages-only-page-files`) |
| Test without rendering | beside the file, `<name>.test.ts` | (reviewer) |
| Test that renders a component | beside the file, `<name>.browser.test.tsx` | (gate: lint:structure `component-test-browser-mode`, which rejects `.test.tsx`) |
| Test that renders a hook | beside the file, `<name>.browser.test.tsx`. A `.test.ts` that calls `renderHook` passes the gate | (reviewer) |
| Domain contract for agents | `src/domain/<domain>/AGENTS.md` | (gate: lint:structure `domain-agents-md`) |

## Ownership

1. A business concept, rule or type belongs to `domain/<domain>/`, whether it has one consumer or ten. (reviewer)
2. Types of the whole domain live at the domain root, in the namespace. The contract of a single operation (`Body`, `Params`, `Response`) lives in that operation's file. (reviewer)
3. A type, helper or hook used by one component or one flow lives beside that owner, inside `components/<flow>/`. It moves to `helpers/` or `hooks/` only when the domain reuses it. The gate accepts both places; the choice is judged. (reviewer)
4. Generic code used by more than one domain goes to `src/domain/@shared/`. With a single owner it stays where it is. (reviewer)

## API boundary

This section covers the folder only. The shape of the operations is in `frontend-api`.

- `api/` holds only `*.query.ts`, `*.service.ts` and `*.keys.ts`, and those suffixes exist nowhere else. (gate: lint:structure `api-folder-content`, `api-suffix-outside-api`)
- Only files in `api/` import `@domain/@shared/http/backend-request`. Components and hooks call an operation, never the transport. Tests and `@shared/http` itself may import it. (gate: lint:structure `transport-outside-api`)
- `api/` has no test files. The operation is covered by the component or hook that uses it. (gate: lint:structure `no-api-tests`)

## Dependency direction

```text
pages           -> domain, domain/@shared
domain          -> other domains (a real business dependency), domain/@shared
domain/@shared  -X-> specific domains and pages
domain          -X-> pages
```

- `@shared` never imports a domain or a page, and a domain never imports a page. The gate resolves aliases and relative paths in `import`, `export ... from`, side-effect imports and `import('...')`. (gate: lint:structure `dependency-direction`)
- A domain imports another domain only for a real business reason, and the other domain does not import it back. The gate does not look at this. (reviewer)
- When `dependency-direction` fails because two areas need the same code, move that code to `src/domain/@shared/`. If it has a business owner, move the importing file to the owner instead. (reviewer)

## Pages

- `src/pages` holds only `*.page.tsx` and `*.page.browser.test.tsx`. (gate: lint:structure `pages-only-page-files`)
- The page exports the function named like the file without `.page`: `Tasks.page.tsx` exports `Tasks`. (gate: lint:structure `component-filename`)
- A page wires the route data and mounts a domain component. It holds no business rule. (reviewer)
- Routes are registered in `src/AppRouter.tsx`. (reviewer)

```tsx
// src/pages/tasks/Tasks.page.tsx
import { TasksContainer } from '@domain/task/components/list/TasksContainer';

export function Tasks() {
    return <TasksContainer />;
}
```

## Opening a new domain

1. Pick a singular lower-case name and create `src/domain/<domain>/`. (reviewer)
2. Create `<domain>.type.ts` with `export namespace <Domain> { ... }`. Start with `Model`. (reviewer)
3. Create `src/domain/<domain>/AGENTS.md`: copy `src/domain/task/AGENTS.md` and rewrite the file map, the data flow and the rules. `lint:structure` rejects a domain without it. (gate: lint:structure `domain-agents-md`)
4. Create `api/<domain>.keys.ts`, then one `*.query.ts` or `*.service.ts` per operation. Follow `frontend-api`.
5. Create the components in `components/<flow>/`, and `hooks/` or `helpers/` only for what two files share. (reviewer)
6. Create `src/pages/<route>/<Name>.page.tsx` and register the route in `src/AppRouter.tsx`. (reviewer)
7. Write `*.browser.test.tsx` beside the container, with the transport mocked. See `frontend-api/references/testing.md`. (reviewer)
8. Run `npm run validate:fast`.

## Final checklist

- [ ] Each new file is in the folder the table above names. (gate: `npm run lint:structure`)
- [ ] No import goes against the dependency diagram. (gate: lint:structure `dependency-direction`)
- [ ] The domain `AGENTS.md` lists every new file. (reviewer)
- [ ] Every new concept sits in the domain that owns it, not in the first place that used it. (reviewer)
- [ ] The page only mounts a domain component. (reviewer)
- [ ] `npm run validate:fast` exits 0.
