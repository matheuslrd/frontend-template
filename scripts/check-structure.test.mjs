import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import { checkStructure } from './check-structure.mjs';

const roots = [];

after(() => {
    roots.forEach((root) => fs.rmSync(root, { force: true, recursive: true }));
});

function makeTree(files) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-structure-'));
    roots.push(root);
    Object.entries(files).forEach(([file, source]) => {
        const target = path.join(root, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, source);
    });
    return root;
}

const QUERY_DOC = '/**\n * @service\n * @route /tasks\n * @http GET\n */\n';
const TRANSPORT_IMPORT = 'import { backendRequest } from \'@domain/@shared/http/backend-request\';\n';
const D = 'src/domain/task/';

const VALID_TREE = {
    [`${D}AGENTS.md`]: '# task\n',
    [`${D}task.type.ts`]: 'export type Task = { id: string };\n',
    [`${D}task.constant.ts`]: 'export const TASK_LIMIT = 10;\n',
    [`${D}api/task.keys.ts`]: 'export const taskKeys = {};\n',
    [`${D}api/list-tasks.query.ts`]: `${QUERY_DOC}${TRANSPORT_IMPORT}export const listTasksQuery = queryOptions({});\n`,
    [`${D}api/create-task.query.ts`]: `${QUERY_DOC}import { backendRequest } from '../../@shared/http/backend-request';\nexport const createTaskQuery = mutationOptions({});\n`,
    [`${D}api/delete-task.service.ts`]: `${QUERY_DOC}${TRANSPORT_IMPORT}export function deleteTask() {}\n`,
    [`${D}helpers/task.helper.ts`]: 'import { format } from \'@domain/@shared/format\';\nexport function sortTasks() {}\n',
    [`${D}helpers/task.helper.test.ts`]: 'import \'./task.helper\';\n',
    [`${D}hooks/useTaskActions.ts`]: 'export function useTaskActions() {}\n',
    [`${D}components/list/TasksContainer.tsx`]: 'export function TasksContainer() {}\n',
    [`${D}components/list/TasksContainer.browser.test.tsx`]: 'import \'./TasksContainer\';\n',
    [`${D}components/list/TaskList.tsx`]: 'export function TaskList() {}\n',
    [`${D}components/create/CreateTaskModal.tsx`]: 'export function CreateTaskModal() {}\n',
    'src/domain/@shared/http/backend-request.ts': 'export function backendRequest() {}\n',
    'src/domain/@shared/format.ts': 'export function format() {}\n',
    'src/domain/@shared/http/client.ts': 'import { backendRequest } from \'./backend-request\';\nexport const client = backendRequest;\n',
    'src/pages/tasks/Tasks.page.tsx': 'import { TaskList } from \'@domain/task/components/list/TaskList\';\nexport function Tasks() {}\n',
};

function violationsFor(overrides, removed = []) {
    const files = { ...VALID_TREE, ...overrides };
    removed.forEach((file) => delete files[file]);
    return checkStructure(makeTree(files));
}

function assertOneViolation(violations, rule, file) {
    assert.equal(violations.length, 1, JSON.stringify(violations));
    assert.equal(violations[0].rule, rule);
    assert.equal(violations[0].file, file);
}

test('returns no violations for a valid tree', () => {
    assert.deepEqual(checkStructure(makeTree(VALID_TREE)), []);
});

test('returns no violations when there is no domain besides @shared', () => {
    assert.deepEqual(checkStructure(makeTree({ 'src/domain/@shared/http/backend-request.ts': '' })), []);
});

test('returns no violations when src has no domain or pages', () => {
    assert.deepEqual(checkStructure(makeTree({ 'src/main.tsx': '' })), []);
});

const CASES = [
    ['dependency-direction', 'src/domain/@shared/format.ts', 'import { Tasks } from \'@pages/tasks/Tasks.page\';\n'],
    ['dependency-direction', 'src/domain/@shared/reexport.ts', 'export * from \'@pages/tasks/Tasks.page\';\n', ' through export from'],
    ['dependency-direction', 'src/domain/@shared/lazy.ts', 'export const lazy = () => import(\'@pages/tasks/Tasks.page\');\n', ' through dynamic import'],
    ['dependency-direction', 'src/domain/@shared/effect.ts', 'import \'@pages/tasks/Tasks.page\';\n', ' through side-effect import'],
    ['transport-outside-api', `${D}helpers/raw.helper.ts`, TRANSPORT_IMPORT],
    ['api-folder-content', `${D}api/task.helper.ts`, ''],
    ['api-suffix-outside-api', `${D}task.keys.ts`, ''],
    ['no-api-tests', `${D}api/list-tasks.test.ts`, ''],
    ['operation-shape', `${D}api/list-tasks.query.ts`, `${QUERY_DOC}export const listTasksQuery = {};\n`],
    ['operation-shape', `${D}api/delete-task.service.ts`, `${QUERY_DOC}export const deleteTask = queryOptions({});\n`],
    ['operation-route-jsdoc', `${D}api/list-tasks.query.ts`, '/**\n * @service\n * @route /tasks\n */\nexport const listTasksQuery = queryOptions({});\n'],
    ['pages-only-page-files', 'src/pages/tasks/TaskList.tsx', 'export function TaskList() {}\n'],
    ['domain-root-files', `${D}utils.ts`, ''],
    ['tsx-outside-components', `${D}ui/Banner.tsx`, 'export function Banner() {}\n'],
    ['helpers-folder-content', `${D}helpers/format.ts`, ''],
    ['hooks-folder-content', `${D}hooks/task-actions.ts`, ''],
    ['component-filename', `${D}components/list/TaskRow.tsx`, 'export function Row() {}\n'],
    ['component-test-browser-mode', `${D}components/list/TaskList.test.tsx`, ''],
];

CASES.forEach(([rule, file, source, form = '']) => {
    const label = form || (file.endsWith('.service.ts') ? ' on a service that builds options' : '');
    test(`flags ${rule}${label}`, () => {
        assertOneViolation(violationsFor({ [file]: source }), rule, file);
    });
});

test('does not flag a .query.ts that uses infiniteQueryOptions', () => {
    const file = `${D}api/list-tasks.query.ts`;
    assert.deepEqual(violationsFor({ [file]: `${QUERY_DOC}export const listTasksQuery = infiniteQueryOptions({});\n` }), []);
});

test('flags domain-agents-md', () => {
    assertOneViolation(violationsFor({}, [`${D}AGENTS.md`]), 'domain-agents-md', `${D}AGENTS.md`);
});

test('flags a relative import that crosses into pages', () => {
    const file = `${D}components/list/TaskList.tsx`;
    const source = 'import { Tasks } from \'../../../../pages/tasks/Tasks.page\';\nexport function TaskList() {}\n';
    assertOneViolation(violationsFor({ [file]: source }), 'dependency-direction', file);
});

test('flags @shared importing a domain through the alias', () => {
    const file = 'src/domain/@shared/keys.ts';
    const source = 'import { taskKeys } from \'@domain/task/api/task.keys\';\n';
    assertOneViolation(violationsFor({ [file]: source }), 'dependency-direction', file);
});

test('allows a test file to import the transport', () => {
    const file = `${D}helpers/raw.helper.test.ts`;
    assert.deepEqual(violationsFor({ [file]: TRANSPORT_IMPORT }), []);
});

test('allows helpers, hooks and types beside their owner inside components/', () => {
    const beside = {
        [`${D}components/create/useCreateTaskForm.ts`]: '',
        [`${D}components/create/create-task.helper.ts`]: '',
        [`${D}components/create/CreateTaskModal.type.ts`]: '',
    };
    assert.deepEqual(violationsFor(beside), []);
});

test('tells how to fix a missing AGENTS.md', () => {
    const [violation] = violationsFor({}, [`${D}AGENTS.md`]);
    assert.match(violation.message, /AGENTS\.md/);
    assert.match(violation.message, /task/);
});

test('tells where to cover an api operation', () => {
    const [violation] = violationsFor({ [`${D}api/list-tasks.test.ts`]: '' });
    assert.match(violation.message, /component or hook/);
});
