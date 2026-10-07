import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../functions/backend/[[path]].ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { onRequest } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

test('gateway forwards exact API path, query, Cookie, Origin and JSON body', async () => {
  const request = new Request('https://ui.example/backend/api/sub/test?target=URI', {
    method: 'PATCH',
    headers: { Cookie: 'session=test-only', Origin: 'https://ui.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: 1, name: 'test' }),
  });
  let forwarded;
  const result = await onRequest({
    request,
    env: { SUB_STORE: { fetch: async value => {
      forwarded = value;
      return new Response('ok', { headers: { 'Set-Cookie': 'session=next; HttpOnly; Secure' } });
    } } },
  });
  assert.equal(forwarded.url, 'https://ui.example/api/sub/test?target=URI');
  assert.equal(forwarded.method, 'PATCH');
  assert.equal(forwarded.headers.get('Cookie'), 'session=test-only');
  assert.equal(forwarded.headers.get('Origin'), 'https://ui.example');
  assert.deepEqual(await forwarded.json(), { version: 1, name: 'test' });
  assert.equal(result.headers.get('Set-Cookie'), 'session=next; HttpOnly; Secure');
});

test('gateway preserves downloadable response stream and content headers', async () => {
  const response = new Response('ss://test', { headers: {
    'Content-Type': 'text/plain',
    'Content-Disposition': 'attachment; filename=test.txt',
    'Cache-Control': 'private, no-store',
  } });
  const result = await onRequest({
    request: new Request('https://ui.example/backend/share/sub/test?token=test-only'),
    env: { SUB_STORE: { fetch: async request => {
      assert.equal(new URL(request.url).pathname, '/share/sub/test');
      return response;
    } } },
  });
  assert.equal(result, response);
  assert.equal(await result.text(), 'ss://test');
  assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
});

test('bare backend is forwarded as API root; unrelated prefix is JSON 404', async () => {
  const rootResult = await onRequest({
    request: new Request('https://ui.example/backend'),
    env: { SUB_STORE: { fetch: async request => {
      assert.equal(new URL(request.url).pathname, '/');
      return Response.json({ status: 'failed' }, { status: 404 });
    } } },
  });
  assert.equal(rootResult.status, 404);
  const rejected = await onRequest({ request: new Request('https://ui.example/backend-other'), env: {} });
  assert.equal(rejected.status, 404);
  assert.equal((await rejected.json()).error.code, 'NOT_FOUND');
});

test('binding failures produce redacted JSON 502 instead of SPA HTML', async () => {
  const result = await onRequest({
    request: new Request('https://ui.example/backend/api/subs'),
    env: { SUB_STORE: { fetch: async () => { throw new Error('internal credentials must not escape'); } } },
  });
  assert.equal(result.status, 502);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
  const text = await result.text();
  assert.equal(JSON.parse(text).error.code, 'BACKEND_UNAVAILABLE');
  assert.ok(!text.includes('credentials'));
});

test('Pages Functions run only for backend routes', async () => {
  const routing = JSON.parse(await readFile(new URL('../public/_routes.json', import.meta.url), 'utf8'));
  assert.deepEqual(routing.include, ['/backend', '/backend/*']);
  assert.deepEqual(routing.exclude, []);
});

