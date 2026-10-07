import assert from 'node:assert/strict';

// Disposable fixtures against the local Pages -> Service Binding -> D1 instance.
const origin = 'http://127.0.0.1:8799';
const prefix = `${origin}/backend`;
const token = process.env.SUB_STORE_TEST_ADMIN_TOKEN;
if (!token) throw new Error('Set SUB_STORE_TEST_ADMIN_TOKEN to the local development credential');
let cookie = '';
const created = [];
const check = (name) => console.log(`PASS ${name}`);
const request = async (path, method = 'GET', body, expected = 200) => {
  const response = await fetch(prefix + path, {
    method,
    headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(response.status, expected, `${method} ${path.split('?')[0]} HTTP status`);
  return response;
};
const json = async (...args) => {
  const data = await (await request(...args)).json();
  assert.equal(data.status, 'success');
  return data.data;
};

const suffix = Date.now();
const subName = `frontend-smoke-sub-${suffix}`;
const colName = `frontend-smoke-col-${suffix}`;
const fileName = `frontend-smoke-file-${suffix}`;
const sub = {
  name: subName, displayName: 'Frontend smoke subscription', source: 'local',
  content: 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@example.com:443#UI-Example',
  mergeSources: '', ignoreFailedRemoteSub: false, passThroughUA: false,
  isIconColor: true, tag: [], subscriptionTags: [],
  process: [{ type: 'Quick Setting Operator', args: { useless: 'DISABLED', udp: 'DEFAULT', scert: 'DEFAULT', tfo: 'DEFAULT', 'vmess aead': 'DEFAULT', reuse: 'DEFAULT', 'block-quic': 'DEFAULT', ecn: 'DEFAULT', 'ip-version': 'DEFAULT' } }],
};
try {
  assert.equal((await json('/health')).backend, 'Cloudflare Workers');
  await request('/api/subs', 'GET', undefined, 401);
  check('public health and management authentication');
  const login = await request('/api/auth/login', 'POST', { token });
  const setCookie = login.headers.get('set-cookie');
  assert.match(setCookie, /; Secure; HttpOnly; SameSite=Strict/);
  cookie = setCookie.split(';')[0];
  assert.equal((await json('/api/auth/session')).authenticated, true);
  check('same-origin login cookie and session');

  const env = await json('/api/utils/env');
  assert.equal(env.capabilities.dynamicScripts, false);
  assert.ok(env.capabilities.processors.includes('Quick Setting Operator'));
  check('capabilities response');

  await json('/api/subs', 'POST', sub, 201); created.push(['/api/sub/', subName]);
  let saved = await json(`/api/sub/${subName}`);
  assert.ok(saved.version >= 1);
  saved = await json(`/api/sub/${subName}`, 'PATCH', { remark: 'saved from smoke', version: saved.version });
  assert.equal(saved.remark, 'saved from smoke');
  await request(`/api/sub/${subName}`, 'PATCH', { remark: 'stale', version: saved.version - 1 }, 409);
  const preview = await json('/api/preview/sub', 'POST', saved);
  assert.equal(preview.processed.length, 1);
  check('subscription default editor payload, version guard and preview');

  await json('/api/collections', 'POST', { name: colName, subscriptions: [subName], subscriptionTags: [], firstSubFlow: true, ignoreFailedRemoteSub: false, process: [] }, 201);
  created.push(['/api/collection/', colName]);
  const col = await json(`/api/collection/${colName}`);
  assert.equal((await json('/api/preview/collection', 'POST', col)).processed.length, 1);
  for (const target of ['JSON', 'ClashMeta', 'sing-box', 'Surge', 'QX', 'ShadowRocket']) {
    const download = await request(`/download/collection/${colName}?target=${encodeURIComponent(target)}`);
    assert.ok((await download.text()).length > 0, `empty ${target} output`);
  }
  check('collection default editor payload and six download formats');

  await json('/api/files', 'POST', { name: fileName, type: 'text', source: 'local', content: 'plain file smoke', tag: [], process: [] }, 201);
  created.push(['/api/file/', fileName]);
  let file = await json(`/api/file/${fileName}`);
  file = await json(`/api/file/${fileName}`, 'PATCH', { remark: 'edited', version: file.version });
  assert.equal((await json('/api/preview/file', 'POST', file)).processed, 'plain file smoke');
  assert.equal(await (await request(`/download/file/${fileName}`)).text(), 'plain file smoke');
  assert.equal(await (await request(`/api/file/${fileName}?raw=1`)).text().then(JSON.parse).then(data => data.name), fileName);
  check('plain file creation, versioned edit, preview and export');

  const sharePayload = { type: 'sub', name: subName, displayName: '', remark: '', tag: [] };
  const share = await json('/api/token', 'POST', { payload: sharePayload, options: { expiresIn: '1d', expiresValue: '1', expiresUnit: 'day' } });
  assert.match(share.token, /^[a-f0-9]{64}$/);
  created.push(['/api/token/', share.token, `?type=sub&name=${subName}`]);
  const updatedShare = await json(`/api/token/${share.token}?type=sub&name=${subName}`, 'PATCH', { payload: { ...sharePayload, remark: 'edited' }, options: { mode: 'count', count: 3, usedCount: 0 } });
  assert.equal(updatedShare.token, share.token);
  const previousCookie = cookie; cookie = '';
  assert.ok((await (await request(`/share/sub/${subName}?token=${share.token}&target=ClashMeta`)).text()).length > 0);
  cookie = previousCookie;
  const shares = await json('/api/tokens');
  const record = shares.find(item => item.token === share.token);
  assert.equal(record.usedCount, 1);
  check('generated public share, atomic edit retaining token, and consumption');

  for (const [type, name] of [['col', colName], ['file', fileName]]) {
    const record = await json('/api/token', 'POST', { payload: { type, name }, options: { expiresIn: '1d' } });
    created.push(['/api/token/', record.token, `?type=${type}&name=${name}`]);
    const sessionCookie = cookie; cookie = '';
    const response = await request(`/share/${type}/${name}?token=${record.token}${type === 'col' ? '&target=JSON' : ''}`);
    const output = await response.text();
    assert.ok(output.length > 0);
    if (type === 'file') assert.equal(output, 'plain file smoke');
    cookie = sessionCookie;
  }
  check('public collection and plaintext file shares');

  const backup = await (await request('/api/storage')).json();
  assert.ok(backup && typeof backup === 'object');
  const logs = await json('/api/logs?limit=10');
  assert.ok(Array.isArray(logs.logs));
  await request('/missing-api-path', 'GET', undefined, 404);
  check('backup download, logs and JSON API 404');
} finally {
  for (const [base, name, query = ''] of created.reverse()) {
    try { await request(base + encodeURIComponent(name) + query, 'DELETE'); } catch { console.error('Fixture cleanup failed'); }
  }
  if (cookie) {
    await json('/api/auth/logout', 'POST', {});
    assert.equal((await json('/api/auth/session')).authenticated, false);
    check('logout revokes session');
  }
}
