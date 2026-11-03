// Kiểm tra tài liệu offline; không listen, connect DB, gửi HTTP hoặc thực thi handler nghiệp vụ.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const spec = read('openapi.json');
const collection = read('postman_collection.json');
const environment = read('postman_environment.json');
const sources = read('source-map.json');
const methods = ['get', 'post', 'put', 'patch', 'delete'];
const documented = new Map();
const ids = new Set();
for (const [routePath, item] of Object.entries(spec.paths)) {
    for (const method of methods.filter(key => item[key])) {
        const operation = item[method];
        const key = `${method.toUpperCase()} ${routePath}`;
        assert(!ids.has(operation.operationId), `Duplicate operationId: ${key}`);
        ids.add(operation.operationId);
        documented.set(key, operation);
        const expected = [...routePath.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort();
        const actual = operation.parameters.filter(p => p.in === 'path');
        assert.deepEqual(actual.map(p => p.name).sort(), expected, `Path params: ${key}`);
        assert(actual.every(p => p.required), `Optional path parameter: ${key}`);
        assert(Object.keys(operation.responses).length, `No response: ${key}`);
    }
}
assert.equal(documented.size, 88);
assert.equal(sources.length, 88);

function walk(value, callback) {
    if (!value || typeof value !== 'object') return;
    callback(value);
    for (const child of Object.values(value)) walk(child, callback);
}
walk(spec, value => {
    if (value.$ref) {
        assert(value.$ref.startsWith('#/'), 'External $ref is not packaged');
        let target = spec;
        for (const segment of value.$ref.slice(2).split('/')) target = target?.[segment];
        assert(target, `Unresolved reference ${value.$ref}`);
    }
});

// Thu registration từ routes/index.js bằng app giả; chỉ đọc Express Router stack.
const registrations = [];
const fakeApp = Object.fromEntries([...methods, 'use'].map(method => [method, (...args) => registrations.push({ method, args })]));
require(path.join(root, 'server/src/routes/index'))(fakeApp);
const actualRoutes = new Map();
const normalizePath = value => value.replace(/:([A-Za-z]+)/g, '{$1}').replace(/\/$/, '') || '/';
function role(handles) {
    return handles.some(h => h.name === 'authAdmin') ? 'admin' : handles.some(h => h.name === 'authUser') ? 'user' : 'public';
}
function add(method, routePath, auth) {
    const key = `${method.toUpperCase()} ${normalizePath(routePath)}`;
    assert(!actualRoutes.has(key) || actualRoutes.get(key) === auth, `Conflicting duplicate auth ${key}`);
    actualRoutes.set(key, auth);
}
for (const { method, args } of registrations) {
    const firstPath = typeof args[0] === 'string' ? args[0] : '';
    const handles = args.filter(arg => typeof arg === 'function');
    const routers = handles.filter(handle => handle.stack);
    for (const router of routers) {
        const inherited = router.stack.filter(layer => !layer.route).map(layer => layer.handle);
        for (const layer of router.stack.filter(layer => layer.route)) {
            const route = layer.route;
            for (const childMethod of methods.filter(m => route.methods[m])) {
                if (method !== 'use' && (childMethod !== method || route.path !== firstPath)) continue;
                add(childMethod, method === 'use' ? firstPath + route.path : firstPath,
                    role([...inherited, ...route.stack.map(child => child.handle)]));
            }
        }
    }
    if (!routers.length && method !== 'use') add(method, firstPath, role(handles));
}
// Không require server.js vì file đó mở server/DB; kiểm tra khai báo chatbot trực tiếp.
const serverSource = fs.readFileSync(path.join(root, 'server/src/server.js'), 'utf8');
assert(/app\.post\('\/api\/chatbot', authUser, chatbotRateLimit,/.test(serverSource));
add('post', '/api/chatbot', 'user');
assert.deepEqual([...actualRoutes.keys()].sort(), [...documented.keys()].sort(), 'Live Express registrations differ from OpenAPI');
for (const [key, auth] of actualRoutes) assert.equal(documented.get(key)['x-route-auth'], auth, `Wrong middleware role ${key}`);
for (const entry of sources) {
    assert(documented.has(`${entry.method} ${entry.path}`));
    for (const source of entry.sources) {
        const match = source.match(/^(.+):(\d+)$/);
        assert(match, `Invalid source reference ${source}`);
        assert(Number(match[2]) <= fs.readFileSync(path.join(root, match[1]), 'utf8').split(/\r?\n/).length, `Invalid source line ${source}`);
    }
}
console.log('PASS 88/88 operations match actual Express registrations and middleware roles; all source lines/$refs/path parameters resolve.');

const requests = collection.item.flatMap(folder => folder.item);
assert.equal(requests.length, documented.size);
assert(!collection.event, 'Collection must not automatically invoke requests');
const variables = new Map(environment.values.map(item => [item.key, item.value]));
const postmanKeys = [];
for (const item of requests) {
    const canonical = item.name.match(/^(GET|POST|PUT|PATCH|DELETE) (\S+) /);
    assert(canonical);
    postmanKeys.push(`${canonical[1]} ${canonical[2]}`);
    for (const match of JSON.stringify(item.request).matchAll(/\{\{([^}]+)\}\}/g)) assert(variables.has(match[1]), `Missing variable ${match[1]}`);
    assert(!item.event, 'No implicit request scripts');
    if (item.request.body?.mode === 'raw') {
        const resolved = item.request.body.raw.replace(/\{\{([^}]+)\}\}/g, (_, key) => String(variables.get(key)));
        assert.doesNotThrow(() => JSON.parse(resolved), `Invalid Postman body after template substitution: ${item.name}`);
    }
}
assert.deepEqual(postmanKeys.sort(), [...documented.keys()].sort(), 'Postman coverage differs');
for (const secret of ['password', 'otp', 'googleIdToken']) assert.equal(variables.get(secret), '', 'Environment contains credentials');
assert(!/-----BEGIN (?:RSA )?PRIVATE KEY-----|AIza[A-Za-z0-9_-]{20,}|mongodb(?:\+srv)?:\/\//.test(JSON.stringify([spec, collection, environment])), 'Possible embedded credential/connection URI');
console.log('PASS Postman has 88 matching requests, defined variables, parseable JSON bodies and empty credential fields.');

let Ajv;
try { Ajv = require(path.join(root, 'client/node_modules/ajv')); }
catch { console.log('SKIP JSON Schema validation: existing client AJV is unavailable. Install project dependencies normally; no dependency is added by this script.'); process.exit(0); }
function createAjv() {
    const ajv = new Ajv({ schemaId: 'auto', allErrors: true, unknownFormats: 'ignore', nullable: true, logger: false });
    ajv.addMetaSchema(require(path.join(root, 'client/node_modules/ajv/lib/refs/json-schema-draft-04.json')));
    return ajv;
}
for (const [cache, artifact, label] of [['openapi-3.0-schema.json', spec, 'OpenAPI 3.0 official schema'],
                                      ['postman-2.1-schema.json', collection, 'Postman Collection 2.1 official schema']]) {
    const file = path.join(root, '.runtime', cache);
    if (!fs.existsSync(file)) { console.log(`SKIP ${label}: official schema cache not present`); continue; }
    const validator = createAjv().compile(JSON.parse(fs.readFileSync(file, 'utf8')));
    assert(validator(artifact), `${label}: ${JSON.stringify(validator.errors)}`);
    console.log(`PASS ${label}`);
}

const ajv = createAjv();
function convert(schema) {
    if (Array.isArray(schema)) return schema.map(convert);
    if (!schema || typeof schema !== 'object') return schema;
    const result = Object.fromEntries(Object.entries(schema).map(([key, value]) => [key, convert(value)]));
    if (result.$ref) result.$ref = result.$ref.replace('#/components/schemas/', 'urn:ecommor:api-schemas#/definitions/');
    return result;
}
ajv.addSchema({ definitions: convert(spec.components.schemas) }, 'urn:ecommor:api-schemas');
let examples = 0;
for (const [key, operation] of documented) {
    const media = operation.requestBody?.content || {};
    for (const [type, content] of Object.entries(media)) {
        if (type !== 'application/json' || content.example === undefined) continue;
        const validate = ajv.compile(convert(content.schema));
        assert(validate(content.example), `Invalid request example ${key}: ${JSON.stringify(validate.errors)}`);
        examples++;
    }
    for (const response of Object.values(operation.responses)) {
        const content = response.content?.['application/json'];
        if (!content || content.example === undefined) continue;
        const validate = ajv.compile(convert(content.schema));
        assert(validate(content.example), `Invalid response example ${key}: ${JSON.stringify(validate.errors)}`);
        examples++;
    }
}
console.log(`PASS ${examples} JSON request/response examples conform to documented schemas (not runtime calls).`);
