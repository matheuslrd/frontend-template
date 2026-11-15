# AGENTS.md

A Vite and React app in the HFM 2 domain architecture. Read this file first, then the skill that matches your task.

## Architecture

Vite, React, TypeScript (`strict`, `noUncheckedIndexedAccess`), Ant Design, TanStack Query, React Router, dayjs. Vitest runs a `unit` project (happy-dom) and a `browser` project (Chromium through Playwright). npm and Node 22 (`.tool-versions`). Import aliases: `@domain/*`, `@pages/*`, `@test/*`.

| Path | Holds |
| --- | --- |
| `src/main.tsx`, `src/AppProviders.tsx`, `src/AppRouter.tsx` | Entry point, antd providers, routes |
| `src/domain/<domain>/` | Everything a business concept owns: types, `api/`, components, hooks, helpers and its own `AGENTS.md` |
| `src/domain/@shared/` | Generic code with no business owner. Today: the HTTP transport in `http/` |
| `src/pages/<route>/` | Only `*.page.tsx` files |
| `src/test/` | Vitest browser setup and the `render` helper |
| `src/domain/task/` | The working example. Read it before writing a domain |
| `dev/` | `mock-tasks-api.ts`, a dev-server mock for the example |
| `scripts/` | `check-structure.mjs` and its test |
| `.agents/` | Skills and the reviewer agent. Edit here. `.claude/skills` and `.claude/agents` are symlinks to it |

## Skills to read

| Situation | Read |
| --- | --- |
| Any React or TypeScript change | `.agents/skills/frontend-development/SKILL.md` |
| Create, move or choose the owner of a file; open a domain | `.agents/skills/frontend-hfm-2/SKILL.md` |
| An HTTP operation, query, mutation, query key or backend mock | `.agents/skills/frontend-api/SKILL.md` |
| Write or change a test | `.agents/skills/frontend-api/references/testing.md` |
| See how the example domain is built | `.agents/skills/frontend-hfm-2/references/domain-example.md` |
| Control flow, `.tsx` order, objects, comments | `.agents/skills/frontend-development/references/code-patterns.md` |
| Work inside a domain | `src/domain/<domain>/AGENTS.md` |

Every code rule in the skills ends with `(gate: <command or rule id>)` or `(reviewer)`. A gate fails a command. A reviewer rule is judged by `code-conventions-reviewer`.

## Validating your work

| Command | When |
| --- | --- |
| `npm run validate:fast` | While you iterate, and in the `pre-push` hook. Runs oxlint, ESLint, `tsc --noEmit` and `check-structure` |
| `npm run validate` | Before a pull request; CI runs it. Adds `test:scripts`, Vitest (unit and browser) and the build |
| `npm run lint:fix` | Applies the autofixes of oxlint and ESLint |

`SKIP_CHECK=1 git push` skips the `pre-push` hook for one push. Never use `--no-verify`. If a hook fails, fix the cause.

## Guardrails

Three layers fail the build. Every rule is an error and no warning passes (`--deny-warnings`, `--max-warnings 0`).

| Layer | Command | Checks |
| --- | --- | --- |
| oxlint, type-aware | `npm run lint:oxlint` | `.oxlintrc.json`: no `any`, `type` over `interface`, `??` and `?.`, boolean conditions, nesting depth 2, no default export, `@ts-expect-error` with a reason, hooks |
| ESLint | `npm run lint:eslint` | `eslint.config.mjs`: `@stylistic`, import order, directive format, the TanStack query-key rule, and `no-restricted-*` for `let`, `switch`, `else`, `try`, `&&` in JSX, `!!`, `Date`, `z.infer`, `should*` names, `fetch` and storage |
| Structure | `npm run lint:structure` | `scripts/check-structure.mjs`: dependency direction, where files live, `api/`, `pages/`, one `AGENTS.md` per domain |

`npm run lint:tsc` runs `tsc --noEmit` as the type check. Never weaken, delete or turn off a rule to make the gate pass: change the code. Rules no command can decide stay with the reviewer.

Scope: the ESLint `no-restricted-*` conventions (`let`, `switch`, `else`, `try`, `&&` in JSX, `!!`, `Date`, `z.infer`, `should*`, `fetch`, storage) and the TanStack key rule cover `src/**/*.{ts,tsx}` only. `dev/`, `scripts/` and config files are outside them, and `dev/mock-tasks-api.ts` uses native `Date`. The oxlint rules, the `@stylistic` rules and the import order cover the whole repo; oxlint skips `*.mjs` files.

## Disabling a rule

Disabling is the last resort. First ask whether the code should change.

- Format: `// eslint-disable-next-line <rule-id> -- <reason>`. The rule id and the reason are required. A bare `eslint-disable` is rejected. (gate: lint:eslint `@eslint-community/eslint-comments/require-description`, `@eslint-community/eslint-comments/no-unlimited-disable`)
- Only ESLint rule ids and `@typescript-eslint/*` ids work in the directive. oxlint also honors the `@typescript-eslint/*` ids, for example `@typescript-eslint/no-explicit-any`.
- oxlint-only ids (`import/*`, `unicorn/*`, `react/*`, `react-hooks/*`) cannot be disabled inline: ESLint answers "Definition for rule not found". Change the code, or add a scoped override in `.oxlintrc.json`. The existing one turns `typescript/consistent-type-definitions` off for `**/*.d.ts`, because declaration merging needs `interface`.
- `oxlint-disable` comments are banned. (gate: lint:eslint `no-warning-comments`)
- TypeScript: `// @ts-expect-error: <reason, 10 characters or more>`. `@ts-ignore` and `@ts-nocheck` are banned. (gate: lint:oxlint `typescript/ban-ts-comment`)

## Code conventions review

Run this before `git push`, on the `.ts` and `.tsx` changes (tests included) that were not reviewed yet.

1. Run `npm run validate:fast` and fix what it reports.
2. Write the patch to a temporary file and keep its path. `<base>` is the commit the work started from, for example `origin/main`. A new untracked file is not in `git diff`: run `git add -N <path>` for it first.

   ```bash
   PATCH=$(mktemp)
   git diff -U0 --no-color --src-prefix=a/ --dst-prefix=b/ <base> -- <paths> > "$PATCH"
   echo "$PATCH"
   ```

3. Start the subagent `code-conventions-reviewer`. Give it `REVIEW_ROOT` (the repository root), `REVIEW_PATHS` (the changed paths), `REVIEW_PATCH` (the path `$PATCH` printed) and, if useful, `REVIEW_TASK` (what the change is for). If your tool has no named subagents, start a generic subagent with the body of `.agents/agents/code-conventions-reviewer.md` as its instructions and the same inputs.
4. The reviewer answers with JSON. Apply each finding, or reject it with a one-line reason. Do not drop a finding silently.
5. Fold the fixes into the reviewed commit before you push, and run `npm run validate:fast` again.
6. Delete the patch file: `rm -f "$PATCH"`.

## Troubleshooting

- Browser tests cannot launch Chromium: run `npm run setup`.
- The `pre-push` hook does not run: run `npm install`. The `prepare` script sets `core.hooksPath` to `.githooks`.
- `lint:structure` fails: the message names the rule id and says where to move or rename the file.
- Claude Code does not see the skills or the reviewer: `.claude/skills` and `.claude/agents` must be symlinks to `../.agents/skills` and `../.agents/agents`. Recreate them with `ln -s` if a checkout turned them into plain files.
