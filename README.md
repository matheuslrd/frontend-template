# Frontend template

A starting point for a frontend app in the HFM 2 domain architecture. It is one Vite app with React, TypeScript, Ant Design and TanStack Query. It comes with a working example domain, a validation gate that fails on what breaks the architecture, and guidance for AI agents.

## Use this template

On GitHub, click **Use this template** to create your own repository, then clone it. You need Node 22 (see `.tool-versions`).

```bash
npm install
npm run setup
npm run dev
```

- `npm install` also points git hooks at `.githooks` (the `prepare` script).
- `npm run setup` downloads Chromium for the browser tests. It is not part of `npm install`: the download is slow and fails offline.
- `npm run dev` serves the example app. A dev-server plugin answers `/api/tasks` from memory, so no backend is needed.

## What you get

- **Architecture.** Business code lives in `src/domain/<domain>/`, generic code in `src/domain/@shared/`, route pages in `src/pages/`. `src/domain/task` is the working example, from the API call to the page.
- **One way to call the backend.** `src/domain/@shared/http/` holds the transport. It never rejects: every failure becomes an error envelope that the operations in `api/` check.
- **A gate.** `npm run validate:fast` runs oxlint (type-aware), ESLint, `tsc --noEmit` and `scripts/check-structure.mjs`. It runs in the `pre-push` hook. `npm run validate` adds the script tests, the Vitest unit and browser projects and the build. GitHub Actions runs it on pull requests and on pushes to `main`.
- **Guidance for agents.** `AGENTS.md` routes to three skills in `.agents/skills/` (`frontend-development`, `frontend-hfm-2`, `frontend-api`) and to a read-only reviewer in `.agents/agents/`. `CLAUDE.md` points to `AGENTS.md`. `.claude/skills` and `.claude/agents` are symlinks to `.agents/`. Every rule in the skills says whether a command checks it or the reviewer judges it.

## First steps in a new app

1. **Rename the package.** Change `name` in `package.json` and `<title>` in `index.html`, then run `npm install` so `package-lock.json` follows.
2. **Delete the example.**
   - Remove `src/domain/task`, `src/pages/tasks` and `dev/mock-tasks-api.ts`.
   - In `src/AppRouter.tsx`, remove the `Tasks` import and the `/` and `/tasks` routes, and add your own.
   - In `vite.config.ts`, remove the `mockTasksApi` import with the comment above it, and remove `mockTasksApi()` from `plugins`.
   - Run `npm run validate:fast`.
3. **Point `VITE_API_URL` at your backend.** `.env` holds the default, `/api`, which the dev mock serves. Put your URL in `.env` for everyone or in `.env.local` (git-ignored) for your machine. The transport expects every response body to be `{ success: true, <key>: payload }` or `{ success: false, msg }`.
4. **Open your first domain.** Follow "Opening a new domain" in `.agents/skills/frontend-hfm-2/SKILL.md`.

The skills quote `src/domain/task` as their example. After you delete it, those quotes point at files that no longer exist. Keep the folder until your first domain is in place, or update the quotes.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server with the in-memory tasks mock |
| `npm run build` | Builds the app into `dist/` |
| `npm run preview` | Serves the build |
| `npm run setup` | Downloads Chromium for the browser tests |
| `npm test` | Runs Vitest: the `unit` and `browser` projects |
| `npm run test:scripts` | Runs the Node tests of `scripts/` |
| `npm run lint:oxlint` | Runs oxlint with type-aware rules |
| `npm run lint:eslint` | Runs ESLint |
| `npm run lint:tsc` | Runs `tsc --noEmit` |
| `npm run lint:structure` | Checks the architecture with `scripts/check-structure.mjs` |
| `npm run lint:fix` | Applies the autofixes of oxlint and ESLint |
| `npm run validate:fast` | Runs the four lint commands above (oxlint, ESLint, `tsc`, structure) |
| `npm run validate` | Runs `validate:fast`, `test:scripts`, `npm test` and `build` |
| `npm run prepare` | Runs on `npm install` and sets `core.hooksPath` to `.githooks` |
