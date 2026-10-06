import assert from 'node:assert/strict';
import test from 'node:test';
import { routeRequest } from '../src/router';

test('E2E Flow - Aggregated Search for "Solo Leveling"', async () => {
  const req = new Request('http://localhost/api/search?q=Solo%20Leveling', {
    method: 'GET',
  });
  const res = await routeRequest(req);
  assert.equal(res.status, 200);

  const json = (await res.json()) as any;
  assert.equal(json.ok, true);
  assert.ok(Array.isArray(json.data));
  assert.ok(json.data.length > 0, 'Aggregated search should return results');

  const first = json.data[0];
  assert.ok(first.id);
  assert.ok(first.title);
  assert.ok(first.providerId);
});

test('E2E Flow - Manga Details, Chapters, and Pages for MangaDex', async () => {
  // 1. Search MangaDex for Berserk (hosted on MangaDex)
  const searchReq = new Request(
    'http://localhost/api/manga/search?q=Berserk&provider=mangadex',
    { method: 'GET' }
  );
  const searchRes = await routeRequest(searchReq);
  assert.equal(searchRes.status, 200);
  const searchJson = (await searchRes.json()) as any;
  assert.ok(searchJson.data.length > 0);
  const mangaId = searchJson.data[0].id;

  // 2. Details
  const detailsReq = new Request(
    `http://localhost/api/manga/mangadex/${mangaId}`,
    { method: 'GET' }
  );
  const detailsRes = await routeRequest(detailsReq);
  assert.equal(detailsRes.status, 200);
  const detailsJson = (await detailsRes.json()) as any;
  assert.equal(detailsJson.ok, true);
  assert.ok(detailsJson.data.title);

  // 3. Chapters
  const chaptersReq = new Request(
    `http://localhost/api/manga/mangadex/${mangaId}/chapters`,
    { method: 'GET' }
  );
  const chaptersRes = await routeRequest(chaptersReq);
  assert.equal(chaptersRes.status, 200);
  const chaptersJson = (await chaptersRes.json()) as any;
  assert.equal(chaptersJson.ok, true);
  assert.ok(Array.isArray(chaptersJson.data));

  if (chaptersJson.data.length > 0) {
    const chapterId = chaptersJson.data[0].id;

    // 4. Pages
    const pagesReq = new Request(
      `http://localhost/api/chapter/mangadex/${chapterId}/pages`,
      { method: 'GET' }
    );
    const pagesRes = await routeRequest(pagesReq);
    assert.equal(pagesRes.status, 200);
    const pagesJson = (await pagesRes.json()) as any;
    assert.equal(pagesJson.ok, true);
    assert.ok(Array.isArray(pagesJson.data));
    assert.ok(pagesJson.data.length > 0);
    assert.ok(pagesJson.data[0].url.startsWith('http'));
  }
});

test('E2E Flow - WeebCentral Details, Chapters, and Pages for One Piece', async () => {
  // WeebCentral search
  const searchReq = new Request(
    'http://localhost/api/manga/search?q=One%20Piece&provider=weebcentral',
    { method: 'GET' }
  );
  const searchRes = await routeRequest(searchReq);
  assert.equal(searchRes.status, 200);
  const searchJson = (await searchRes.json()) as any;
  assert.ok(searchJson.data.length > 0);
  const mangaId = searchJson.data[0].id;

  // Details
  const detailsReq = new Request(
    `http://localhost/api/manga/weebcentral/${mangaId}`,
    { method: 'GET' }
  );
  const detailsRes = await routeRequest(detailsReq);
  assert.equal(detailsRes.status, 200);
  const detailsJson = (await detailsRes.json()) as any;
  assert.equal(detailsJson.ok, true);
  assert.ok(detailsJson.data.title.toLowerCase().includes('one piece'));

  // Chapters
  const chaptersReq = new Request(
    `http://localhost/api/manga/weebcentral/${mangaId}/chapters`,
    { method: 'GET' }
  );
  const chaptersRes = await routeRequest(chaptersReq);
  assert.equal(chaptersRes.status, 200);
  const chaptersJson = (await chaptersRes.json()) as any;
  assert.equal(chaptersJson.ok, true);
  assert.ok(Array.isArray(chaptersJson.data));
  assert.ok(chaptersJson.data.length > 0);

  const chapterId = chaptersJson.data[0].id;

  // Pages
  const pagesReq = new Request(
    `http://localhost/api/chapter/weebcentral/${chapterId}/pages`,
    { method: 'GET' }
  );
  const pagesRes = await routeRequest(pagesReq);
  assert.equal(pagesRes.status, 200);
  const pagesJson = (await pagesRes.json()) as any;
  assert.equal(pagesJson.ok, true);
  assert.ok(Array.isArray(pagesJson.data));
  assert.ok(pagesJson.data.length > 0);
  assert.ok(pagesJson.data[0].url.startsWith('http'));
});

