import fs from 'node:fs';
import path from 'node:path';

const TRANSPORT = 'src/domain/@shared/http/backend-request';
const API_SUFFIXES = ['.query.ts', '.service.ts', '.keys.ts'];
const IMPORT_PATTERN = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const ALIASES = { '@domain/': 'src/domain/', '@pages/': 'src/pages/', '@test/': 'src/test/' };

const violation = (file, rule, message) => ({ file, rule, message });
const isTest = (name) => /\.test\.tsx?$/.test(name);
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasSuffix = (name, suffixes) => suffixes.some((suffix) => name.endsWith(suffix));

function listFiles(dir, rootDir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory())
            return listFiles(full, rootDir);
        const file = path.relative(rootDir, full).split(path.sep).join('/');
        const isCode = /\.tsx?$/.test(file);
        return [{ path: file, source: isCode ? fs.readFileSync(full, 'utf8') : '' }];
    });
}

function resolveSpec(spec, file) {
    const alias = Object.keys(ALIASES).find((prefix) => spec.startsWith(prefix));
    if (alias)
        return ALIASES[alias] + spec.slice(alias.length);
    if (spec.startsWith('.'))
        return path.posix.join(path.posix.dirname(file), spec);
    return null;
}

function importTargets({ path: file, source }) {
    return [...source.matchAll(IMPORT_PATTERN)]
        .map((match) => resolveSpec(match[1] ?? match[2] ?? match[3], file))
        .filter(Boolean);
}

// Describes where a file lives: domain name, first folder inside the domain, and its basename.
function locate(file) {
    const parts = file.path.split('/');
    const inDomain = parts[1] === 'domain' && parts.length > 3;
    return {
        ...file,
        name: parts.at(-1),
        area: parts[1],
        domain: inDomain ? parts[2] : null,
        folder: inDomain ? parts[3] : null,
        isShared: inDomain && parts[2] === '@shared',
        isDomain: inDomain && parts[2] !== '@shared',
        isRootFile: inDomain && parts.length === 4,
    };
}

function dependencyDirection(file) {
    const forbidden = file.isShared
        ? (target) => {
            const [, area, domain] = target.split('/');
            return area === 'pages' || (area === 'domain' && domain !== '@shared');
        }
        : (target) => file.isDomain && target.split('/')[1] === 'pages';
    const advice = file.isShared
        ? '@shared cannot depend on a domain or on pages; move the imported code into src/domain/@shared, or move this file into the domain that owns it'
        : 'move what pages and domains share into src/domain/@shared (pages may import domains, never the reverse)';
    return importTargets(file)
        .filter(forbidden)
        .map((target) => violation(file.path, 'dependency-direction', `imports ${target}; ${advice}.`));
}

function transportOutsideApi(file) {
    const allowed = isTest(file.name) || file.folder === 'api' || file.path.startsWith('src/domain/@shared/http/');
    if (allowed)
        return [];
    return importTargets(file)
        .filter((target) => target === TRANSPORT || target.startsWith(`${TRANSPORT}.`))
        .map(() => violation(file.path, 'transport-outside-api', 'only api/ operations may call backend-request; create an operation in api/ (.query.ts or .service.ts) and use it here.'));
}

function apiFolderContent(file) {
    if (file.folder !== 'api' || isTest(file.name) || hasSuffix(file.name, API_SUFFIXES))
        return [];
    return [violation(file.path, 'api-folder-content', 'api/ only holds files ending in .query.ts, .service.ts or .keys.ts; rename the file or move it out of api/.')];
}

function apiSuffixOutsideApi(file) {
    if (file.folder === 'api' || !hasSuffix(file.name, API_SUFFIXES))
        return [];
    return [violation(file.path, 'api-suffix-outside-api', 'the .query.ts, .service.ts and .keys.ts suffixes belong to api/; move the file to src/domain/<domain>/api/.')];
}

function noApiTests(file) {
    if (file.folder !== 'api' || !isTest(file.name))
        return [];
    return [violation(file.path, 'no-api-tests', 'api operations are not tested alone; cover the operation through the component or hook that uses it.')];
}

function operationShape(file) {
    const hasOptions = /\b(?:queryOptions|infiniteQueryOptions|mutationOptions)\(/.test(file.source);
    if (file.name.endsWith('.query.ts') && !hasOptions) {
        return [violation(file.path, 'operation-shape', 'a .query.ts must build queryOptions( or mutationOptions(; if it does not, rename it to .service.ts.')];
    }
    if (file.name.endsWith('.service.ts') && hasOptions) {
        return [violation(file.path, 'operation-shape', 'a .service.ts must not build queryOptions( or mutationOptions(; rename it to .query.ts.')];
    }
    return [];
}

function operationRouteJsdoc(file) {
    if (!hasSuffix(file.name, ['.query.ts', '.service.ts']))
        return [];
    if (file.source.includes('@route') && file.source.includes('@http'))
        return [];
    return [violation(file.path, 'operation-route-jsdoc', 'add the JSDoc block above the operation: /**\n * @service\n * @route /tasks\n * @http GET\n */ (@route is the path, @http is the HTTP method).')];
}

function pagesOnlyPageFiles(file) {
    if (file.area !== 'pages' || /\.page(?:\.browser\.test)?\.tsx$/.test(file.name))
        return [];
    return [violation(file.path, 'pages-only-page-files', 'src/pages only holds *.page.tsx and *.page.browser.test.tsx; move the component to a domain (src/domain/<domain>/components/).')];
}

function domainRootFiles(file) {
    if (!file.isDomain || !file.isRootFile || file.name === 'AGENTS.md')
        return [];
    const pattern = new RegExp(`^${escapeRegExp(file.domain)}\\.[\\w-]+(?:\\.test)?\\.ts$`);
    if (pattern.test(file.name))
        return [];
    return [violation(file.path, 'domain-root-files', `the domain root only holds AGENTS.md and ${file.domain}.<kind>.ts; move the file into api/, helpers/, hooks/ or components/.`)];
}

function tsxOutsideComponents(file) {
    if (!file.isDomain || file.folder === 'components' || !file.name.endsWith('.tsx'))
        return [];
    if (file.name.endsWith('.browser.test.tsx'))
        return [];
    return [violation(file.path, 'tsx-outside-components', 'a domain .tsx file belongs in components/; move it to src/domain/<domain>/components/.')];
}

function helpersFolderContent(file) {
    if (!file.isDomain || file.folder !== 'helpers')
        return [];
    if (hasSuffix(file.name, ['.helper.ts', '.helper.type.ts']) || isTest(file.name))
        return [];
    return [violation(file.path, 'helpers-folder-content', 'helpers/ only holds *.helper.ts, *.helper.type.ts and tests; rename the file with the .helper.ts suffix.')];
}

function hooksFolderContent(file) {
    if (!file.isDomain || file.folder !== 'hooks' || file.name.startsWith('use'))
        return [];
    return [violation(file.path, 'hooks-folder-content', 'files in hooks/ must start with the "use" prefix (e.g. useTaskActions.ts); rename the file.')];
}

function componentFilename(file) {
    const inComponents = file.folder === 'components' || file.area === 'pages';
    if (!inComponents || !file.name.endsWith('.tsx') || isTest(file.name))
        return [];
    const base = file.name.replace(/\.tsx$/, '').replace(/\.page$/, '');
    if (new RegExp(`export (?:function|const) ${escapeRegExp(base)}\\b`).test(file.source))
        return [];
    return [violation(file.path, 'component-filename', `the file must export function ${base} (or const ${base}); rename the file or the component so they match.`)];
}

function componentTestBrowserMode(file) {
    if (!file.name.endsWith('.test.tsx') || file.name.endsWith('.browser.test.tsx'))
        return [];
    return [violation(file.path, 'component-test-browser-mode', 'component tests run in browser mode; rename the file to *.browser.test.tsx.')];
}

function domainAgentsMd(files) {
    const domains = new Set(files.filter((file) => file.isDomain).map((file) => file.domain));
    return [...domains]
        .filter((domain) => !files.some((file) => file.path === `src/domain/${domain}/AGENTS.md`))
        .map((domain) => violation(`src/domain/${domain}/AGENTS.md`, 'domain-agents-md', `domain ${domain} has no AGENTS.md; copy the one from another domain and describe the file map and rules of ${domain}.`));
}

const FILE_RULES = [
    dependencyDirection, transportOutsideApi, apiFolderContent, apiSuffixOutsideApi, noApiTests,
    operationShape, operationRouteJsdoc, pagesOnlyPageFiles, domainRootFiles, tsxOutsideComponents,
    helpersFolderContent, hooksFolderContent, componentFilename, componentTestBrowserMode,
];

export function checkStructure(rootDir) {
    const srcDir = path.join(rootDir, 'src');
    if (!fs.existsSync(srcDir))
        return [];
    const files = listFiles(srcDir, rootDir).map(locate);
    return [...files.flatMap((file) => FILE_RULES.flatMap((rule) => rule(file))), ...domainAgentsMd(files)];
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
    const violations = checkStructure(process.cwd());
    violations.forEach(({ file, rule, message }) => console.log(`${file}: [${rule}] ${message}`));
    process.exitCode = violations.length > 0 ? 1 : 0;
}
