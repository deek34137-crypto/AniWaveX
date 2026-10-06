import assert from 'node:assert/strict';
import test from 'node:test';
import { routeRequest } from '../src/router';

test('Router - GET /health', async () => {
  const req = new Request('http://localhost/health', { method: 'GET' });
  const res = await routeRequest(req);
  assert.equal(res.status, 200);

  const json = (await res.json()) as any;
  assert.equal(json.ok, true);
  assert.equal(json.service, 'aniwavex-manga-worker');
  assert.equal(json.version, '1.0.0');
});

test('Router - GET /api/providers', async () => {
  const req = new Request('http://localhost/api/providers', { method: 'GET' });
  const res = await routeRequest(req);
  assert.equal(res.status, 200);

  const json = (await res.json()) as any;
  assert.equal(json.ok, true);
  assert.ok(Array.isArray(json.data));
  assert.ok(json.data.length >= 4);
});

test('Router - CORS preflight OPTIONS', async () => {
  const req = new Request('http://localhost/api/manga/search?q=test', {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:3000' },
  });
  const res = await routeRequest(req);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3000');
});

test('Router - 400 when missing query parameter q', async () => {
  const req = new Request('http://localhost/api/search', { method: 'GET' });
  const res = await routeRequest(req);
  assert.equal(res.status, 400);

  const json = (await res.json()) as any;
  assert.equal(json.ok, false);
  assert.equal(json.error.code, 'MISSING_PARAM');
});

test('Router - 404 for unknown routes', async () => {
  const req = new Request('http://localhost/api/nonexistent_path', { method: 'GET' });
  const res = await routeRequest(req);
  assert.equal(res.status, 404);

  const json = (await res.json()) as any;
  assert.equal(json.ok, false);
  assert.equal(json.error.code, 'NOT_FOUND');
});

test('Security - SSRF block on private IP in image proxy', async () => {
  const req = new Request(
    'http://localhost/api/image/weebcentral?url=http://127.0.0.1:8080/admin',
    { method: 'GET' }
  );
  const res = await routeRequest(req);
  assert.equal(res.status, 403);

  const json = (await res.json()) as any;
  assert.equal(json.ok, false);
  assert.equal(json.error.code, 'SSRF_BLOCKED');
});

test('Security - SSRF block on internal private IP in proxy/html', async () => {
  const req = new Request(
    'http://localhost/api/proxy/html?url=http://192.168.1.1/secret',
    { method: 'GET' }
  );
  const res = await routeRequest(req);
  assert.equal(res.status, 403);

  const json = (await res.json()) as any;
  assert.equal(json.ok, false);
  assert.equal(json.error.code, 'SSRF_BLOCKED');
});

test('Security - SSRF block on unauthorized public host in image proxy', async () => {
  const req = new Request(
    'http://localhost/api/image/weebcentral?url=https://malicious-external-site.com/evil.png',
    { method: 'GET' }
  );
  const res = await routeRequest(req);
  assert.equal(res.status, 403);

  const json = (await res.json()) as any;
  assert.equal(json.ok, false);
  assert.equal(json.error.code, 'HOST_NOT_ALLOWED');
});

