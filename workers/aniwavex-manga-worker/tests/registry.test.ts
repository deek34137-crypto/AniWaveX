import assert from 'node:assert/strict';
import test from 'node:test';
import { registry } from '../src/providers/registry';

test('Provider Registry - provider discovery', () => {
  const all = registry.getAll();
  assert.ok(all.length >= 4, 'Should have at least 4 registered providers');

  const ids = all.map((p) => p.id);
  assert.ok(ids.includes('mangadex'), 'Should contain mangadex');
  assert.ok(ids.includes('comick'), 'Should contain comick');
  assert.ok(ids.includes('weebcentral'), 'Should contain weebcentral');
  assert.ok(ids.includes('mangakakalot'), 'Should contain mangakakalot');
});

test('Provider Registry - capabilities check', () => {
  const mangadex = registry.get('mangadex');
  assert.equal(mangadex.capabilities.search, true);
  assert.equal(mangadex.capabilities.chapters, true);
  assert.equal(mangadex.capabilities.pages, true);
  assert.equal(mangadex.tier, 'A');
});

test('Provider Registry - non-existent provider throws 404', () => {
  assert.throws(
    () => {
      registry.get('non_existent_provider_xyz');
    },
    (err: any) => err.code === 'PROVIDER_NOT_FOUND' && err.statusCode === 404
  );
});

test('Provider Registry - tier filtering', () => {
  const tierA = registry.getByTier('A');
  assert.ok(tierA.length >= 2);
  for (const p of tierA) {
    assert.equal(p.tier, 'A');
  }
});
