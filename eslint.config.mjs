import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import stylistic from '@stylistic/eslint-plugin';
import tanstackQuery from '@tanstack/eslint-plugin-query';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

const sourceFiles = ['src/**/*.{ts,tsx}'];

// Names the code declares itself; property keys and member accesses (third-party option names) are not listed.
const declaredNames = [
    'VariableDeclarator > Identifier.id',
    'FunctionDeclaration > Identifier.id',
    ':function > Identifier.params',
    'ObjectPattern > Property > Identifier.value',
    'ArrayPattern > Identifier',
    'AssignmentPattern > Identifier.left',
    'RestElement > Identifier.argument',
];

const fetchGlobal = {
    name: 'fetch',
    message: 'Use `backendRequest` from `@domain/@shared/http/backend-request`.',
};

const localStorageGlobal = {
    name: 'localStorage',
    message: 'Do not use `localStorage`; keep the state in React or the query cache.',
};

const sessionStorageGlobal = {
    name: 'sessionStorage',
    message: 'Do not use `sessionStorage`; keep the state in React or the query cache.',
};

export default [
    { ignores: ['dist'] },
    {
        files: ['**/*.{ts,tsx,mjs}'],
        languageOptions: { parser: tseslint.parser },
        linterOptions: { reportUnusedDisableDirectives: 'off' },
        plugins: {
            '@eslint-community/eslint-comments': eslintComments,
            '@stylistic': stylistic,
            '@typescript-eslint': tseslint.plugin,
            'simple-import-sort': simpleImportSort,
        },
        rules: {
            '@stylistic/indent': ['error', 4],
            '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/comma-dangle': ['error', 'always-multiline'],
            '@stylistic/member-delimiter-style': [
                'error',
                {
                    multiline: { delimiter: 'comma', requireLast: true },
                    singleline: { delimiter: 'comma', requireLast: false },
                },
            ],
            '@stylistic/list-style': ['error', { overrides: { '()': 'off', '[]': 'off', '<>': 'off' } }],
            '@stylistic/nonblock-statement-body-position': ['error', 'below'],
            '@stylistic/eol-last': 'error',
            '@stylistic/no-trailing-spaces': 'error',
            '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
            '@stylistic/jsx-quotes': ['error', 'prefer-double'],
            'simple-import-sort/imports': [
                'error',
                {
                    groups: [
                        ['^react(\\u0000)?$', '^@?\\w'],
                        ['^\\u0000'],
                        ['^@(domain|pages|test)/'],
                        ['^\\.\\.'],
                        ['^\\.(?!\\.)'],
                    ],
                },
            ],
            'simple-import-sort/exports': 'error',
            '@eslint-community/eslint-comments/require-description': 'error',
            '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
            'no-warning-comments': ['error', { terms: ['oxlint-disable'], location: 'anywhere' }],
        },
    },
    ...tanstackQuery.configs['flat/recommended'].map((config) => ({
        ...config,
        files: sourceFiles,
        rules: Object.fromEntries(Object.keys(config.rules).map((rule) => [rule, 'error'])),
    })),
    {
        files: sourceFiles,
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: "VariableDeclaration[kind='let']",
                    message: 'Use `const`: derive the value or assign a property on a `const` object.',
                },
                {
                    selector: 'SwitchStatement',
                    message: 'Use a lookup in an object literal or an early return.',
                },
                {
                    selector: 'IfStatement[alternate]',
                    message: 'Use an early return instead of `else`.',
                },
                {
                    selector: 'TryStatement',
                    message: 'Let the error reach the error boundary; `.catch()` is allowed.',
                },
                {
                    selector: "JSXExpressionContainer > LogicalExpression[operator='&&']",
                    message: 'Use a ternary with `null`: `condition ? <Element /> : null`.',
                },
                {
                    selector: "UnaryExpression[operator='!'] > UnaryExpression[operator='!']",
                    message: 'Use an explicit comparison instead of `!!value`.',
                },
                {
                    selector: "NewExpression[callee.name='Date']",
                    message: 'Use `dayjs` instead of `new Date()`.',
                },
                {
                    selector: "MemberExpression[object.name='Date']",
                    message: 'Use `dayjs` instead of `Date`.',
                },
                {
                    selector: "TSQualifiedName[left.name='z'][right.name='infer']",
                    message: 'Write the type by hand and tie the schema to it with `satisfies z.ZodType<T>`.',
                },
                {
                    selector: `:matches(${declaredNames.join(', ')})[name=/^should[A-Z]/]`,
                    message: 'Name booleans with the prefix `is`, `has` or `can`.',
                },
            ],
            'no-restricted-globals': ['error', fetchGlobal, localStorageGlobal, sessionStorageGlobal],
            'no-restricted-properties': [
                'error',
                { object: 'window', property: 'fetch', message: fetchGlobal.message },
                { object: 'globalThis', property: 'fetch', message: fetchGlobal.message },
                { object: 'window', property: 'localStorage', message: localStorageGlobal.message },
                { object: 'window', property: 'sessionStorage', message: sessionStorageGlobal.message },
            ],
        },
    },
    {
        files: ['src/domain/@shared/http/backend-request.ts'],
        rules: {
            'no-restricted-globals': ['error', localStorageGlobal, sessionStorageGlobal],
        },
    },
];
