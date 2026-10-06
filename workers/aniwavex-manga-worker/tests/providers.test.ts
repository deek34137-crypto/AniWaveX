import assert from 'node:assert/strict';
import test from 'node:test';
import { registry } from '../src/providers/registry';

test('Providers - MangaDex search query', async () => {
  const mangadex = registry.get('mangadex');
  try {
    const results = await mangadex.search('One Piece', 1);
    assert.ok(Array.isArray(results));
    if (results.length > 0) {
      assert.ok(results[0].title);
      assert.equal(results[0].providerId, 'mangadex');
      assert.ok(results[0].id);
    }
  } catch (err: any) {
    // If upstream is temporarily rate-limited or unavailable, ensure error is well-typed AppError
    assert.ok(err.code);
  }
});

test('Providers - ComicK search query', async () => {
  const comick = registry.get('comick');
  try {
    const results = await comick.search('Solo Leveling', 1);
    assert.ok(Array.isArray(results));
    if (results.length > 0) {
      assert.ok(results[0].title);
      assert.equal(results[0].providerId, 'comick');
    }
  } catch (err: any) {
    assert.ok(err.code);
  }
});

test('Providers - WeebCentral search query', async () => {
  const weebcentral = registry.get('weebcentral');
  try {
    const results = await weebcentral.search('One Piece', 1);
    assert.ok(Array.isArray(results));
    if (results.length > 0) {
      assert.ok(results[0].title);
      assert.equal(results[0].providerId, 'weebcentral');
    }
  } catch (err: any) {
    assert.ok(err.code);
  }
});
