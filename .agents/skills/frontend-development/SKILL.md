---
name: frontend-development
description: Core standards for React and TypeScript work in this app: components, pages, hooks, helpers and domain logic. Use whenever you create, change, review or move code under src. It routes to frontend-hfm-2 for file placement and to frontend-api for HTTP operations and their tests.
---

# frontend-development

The entry point for any code change in this app. It says which other skill to read, the order of work, the semantic rules and the code conventions. Marks: `(gate: ...)` means a command fails on a violation, `(reviewer)` means the `code-conventions-reviewer` judges it.

## Orchestration

Read the skill that matches the files you touch. Skills live at `.agents/skills/<name>/SKILL.md`.

| You touch | Read |
| --- | --- |
| Create, move, rename or choose the owner of a file under `src/domain` or `src/pages`, or open a domain | `.agents/skills/frontend-hfm-2/SKILL.md` |
| A file in an `api/` folder, `src/domain/@shared/http`, a query, mutation or query key, or anything that calls the backend | `.agents/skills/frontend-api/SKILL.md` |
| `*.test.ts`, `*.browser.test.tsx` or `src/test` | `.agents/skills/frontend-api/references/testing.md` |
| Component, hook or helper code | this skill and `references/code-patterns.md` |

## Flow

1. Read the nearest `AGENTS.md`: the domain's (`src/domain/<domain>/AGENTS.md`) when you work in a domain, then the root one.
2. Open the neighbors: the other files of the same folder and kind, and the matching file in `src/domain/task`. Copy their shape.
3. Implement.
4. Run `npm run validate:fast`. Fix a failure by changing the code, never the rule.
5. Before `git push`, run the code conventions review described in the root `AGENTS.md`.

## Semantic rules

- Reuse the domain types and derive from them instead of retyping: `Task.Model['id']`, `Pick<Task.Model, 'title'>`. Two types with the same shape are not the same concept. (reviewer)
- Read required data directly. Do not add `?.`, `??` or a default for a value the flow guarantees. The gate rejects `?.` and `??` only on a type that is never nullish. When the type is wrongly optional, the reviewer judges. (gate: lint:oxlint `typescript/no-unnecessary-condition`; reviewer for the rest)
- Keep server data in the query cache. Never copy query data into `useState`. (reviewer)
- Do not use `useEffect` to derive a value, fetch data or answer an event. Compute during render, use a query, or use the event handler. (reviewer)
- Business rules live in the domain (a helper or a hook), not in a page or in JSX. (reviewer)
- Style with the least CSS possible. First an antd prop (`<Flex gap="middle">`, `<Button danger>`), then a design token in `style` (`token.paddingLG` from `theme.useToken()`), then CSS. (reviewer)
- Comment only a decision that is not obvious from the code. (reviewer)
- Guard against a double submit with more than `isPending`. See `frontend-api`. (reviewer)

## Code conventions

The `no-restricted-*` rules (`let`, `switch`, `else`, `try`, `&&` in JSX, `!!`, `Date`, `z.infer`, `should*`, `fetch`, storage) and the TanStack key rule cover `src/` only. `dev/`, `scripts/` and config files are outside them: `dev/mock-tasks-api.ts` uses native `Date`.

| Rule | Mark |
| --- | --- |
| `const` only. Derive the value or assign a property on a `const` object. | (gate: lint:eslint `no-restricted-syntax`) |
| No `switch`: use an object lookup, as `TASK_STATUS_LABELS[status]` does. | (gate: lint:eslint `no-restricted-syntax`) |
| No `else`: use an early return. | (gate: lint:eslint `no-restricted-syntax`) |
| No `try`. The transport never rejects and operations throw a `ServiceError` into the query or mutation error state, so there is nothing to catch. `.catch()` is allowed. | (gate: lint:eslint `no-restricted-syntax`) |
| No `condition && <Element />` in JSX: use a ternary with `null`. | (gate: lint:eslint `no-restricted-syntax`) |
| No `!!value`: compare explicitly. | (gate: lint:eslint `no-restricted-syntax`) |
| No `new Date()` and no `Date.<member>` such as `Date.now()`: use `dayjs`. The gate does not see `instanceof Date` or the `Date` type. It covers `src/` only. | (gate: lint:eslint `no-restricted-syntax`) |
| No `z.infer`. See `frontend-api`. | (gate: lint:eslint `no-restricted-syntax`) |
| A boolean you declare is not named `should*`. The gate sees variables, destructured bindings, parameters and function names. | (gate: lint:eslint `no-restricted-syntax`) |
| A boolean is named with `is`, `has` or `can`, also in type members, object keys and class fields. The gate only rejects `should[A-Z]*`, so `export const open = true;` passes it. | (reviewer) |
| No `fetch`, `localStorage` or `sessionStorage` (also as `window.` or `globalThis.`). The transport and the query cache replace them. | (gate: lint:eslint `no-restricted-globals`, `no-restricted-properties`) |
| A one-statement body has no braces and starts on the next line. Braces only for several statements, a multi-line statement or a nested `if`. | (gate: lint:oxlint `curly`; lint:eslint `@stylistic/nonblock-statement-body-position`) |
| Block nesting is at most 2 deep. Return early or extract a function. | (gate: lint:oxlint `max-depth`) |
| No `any`: use `unknown` and narrow. | (gate: lint:oxlint `typescript/no-explicit-any`) |
| `type` instead of `interface`. Only `.d.ts` files may declare an interface. | (gate: lint:oxlint `typescript/consistent-type-definitions`) |
| `??` for a nullish default, not a logical-or fallback. An optional chain instead of repeating the object in an `&&` chain. | (gate: lint:oxlint `typescript/prefer-nullish-coalescing`, `typescript/prefer-optional-chain`) |
| Compare explicitly in a condition. The gate rejects a nullable string, number or boolean and `any`. It accepts a plain string, a plain number and a nullable object, so prefer the explicit comparison anyway. | (gate: lint:oxlint `typescript/strict-boolean-expressions`; reviewer for the rest) |
| `===`, no `console`, no `var`, a radix in `parseInt`, unused names start with `_`, throw only `Error` objects, no `return await` outside `try`. | (gate: lint:oxlint `eqeqeq`, `no-console`, `no-var`, `radix`, `no-unused-vars`, `typescript/only-throw-error`, `typescript/return-await`) |
| Named exports only. Config files (`vite.config.ts`, `*.config.*`) may export default. | (gate: lint:oxlint `import/no-default-export`) |
| `@ts-expect-error: <reason of 10 or more characters>`. `@ts-ignore` and `@ts-nocheck` are banned. | (gate: lint:oxlint `typescript/ban-ts-comment`) |
| A `.tsx` file contains JSX. Hooks and helpers are `.ts`. | (gate: lint:oxlint `react/jsx-filename-extension`) |
| Rules of hooks and effect dependencies. | (gate: lint:oxlint `react/rules-of-hooks`, `react/exhaustive-deps`) |
| A function that captures nothing from its parent sits at module level. | (gate: lint:oxlint `unicorn/consistent-function-scoping`) |
| The props type is named `Props`. | (reviewer) |
| A module constant is `SCREAMING_SNAKE_CASE`. | (reviewer) |
| No `renderXxx` function that returns JSX: extract a component. | (reviewer) |
| 4-space indent, single quotes, semicolons, trailing commas, sorted imports. `npm run lint:fix` repairs them. | (gate: lint:eslint `@stylistic/*`, `simple-import-sort/imports`) |
| A directive that disables a rule names the rule and a reason. See `AGENTS.md`. | (gate: lint:eslint `@eslint-community/eslint-comments/require-description`, `@eslint-community/eslint-comments/no-unlimited-disable`) |

## Where the patterns are

| You need | Section of `references/code-patterns.md` |
| --- | --- |
| Early return, lookup instead of `switch`, a ternary in JSX, no `let` | Control flow and conditional rendering |
| The order of a `.tsx` file | Structure of a `.tsx` file |
| An object with optional keys | Building objects |
| When and how to comment | Comments |

## Checklist

- [ ] I read the nearest `AGENTS.md` and the skill for each path I touched.
- [ ] The new files look like their neighbors in `src/domain/task`. (reviewer)
- [ ] Types derive from the domain types. (reviewer)
- [ ] No state mirrors query data, and no `useEffect` computes a value. (reviewer)
- [ ] Styling goes prop, then token, then CSS. (reviewer)
- [ ] `npm run validate:fast` exits 0 and the conventions review ran.
