import assert from 'node:assert/strict';
import test from 'node:test';
import { deduplicateSearchResults, titleSimilarityScore } from '../src/utils/dedupe';
import {
  cleanChapterTitle,
  cleanHtmlText,
  extractChapterNumber,
  normalizeStatus,
} from '../src/utils/normalize';

test('Normalization - extractChapterNumber handles numbers, titles, and URLs', () => {
  assert.equal(extractChapterNumber(12), 12);
  assert.equal(extractChapterNumber('105.5'), 105.5);
  assert.equal(extractChapterNumber(undefined, 'Chapter 24: The Awakening'), 24);
  assert.equal(extractChapterNumber(undefined, 'Ch. 99.1'), 99.1);
  assert.equal(extractChapterNumber(undefined, '', 'https://site.com/manga/title/chapter-55'), 55);

  // Must not treat UUIDs as chapter numbers
  assert.equal(
    extractChapterNumber('1f60069b-0c36-45c9-bd9d-41d51e90c552', 'Random Title'),
    0
  );
});

test('Normalization - cleanChapterTitle', () => {
  assert.equal(cleanChapterTitle('211', 211), 'Chapter 211');
  assert.equal(
    cleanChapterTitle('Who the Heck?', 211),
    'Chapter 211: Who the Heck?'
  );
  assert.equal(
    cleanChapterTitle('Chapter 50: The Climax', 50),
    'Chapter 50: The Climax'
  );
});

test('Normalization - normalizeStatus', () => {
  assert.equal(normalizeStatus('Publishing'), 'Ongoing');
  assert.equal(normalizeStatus('FINISHED'), 'Completed');
  assert.equal(normalizeStatus('On Hiatus'), 'Hiatus');
  assert.equal(normalizeStatus('Discontinued'), 'Cancelled');
  assert.equal(normalizeStatus('Unknown 123'), 'Unknown');
});

test('Normalization - cleanHtmlText', () => {
  assert.equal(
    cleanHtmlText('<p>Hello&nbsp;world!<br/>Second line</p>'),
    'Hello world!\nSecond line'
  );
});

test('Deduplication - titleSimilarityScore and deduplicateSearchResults', () => {
  assert.equal(titleSimilarityScore('One Piece', 'One Piece'), 1.0);
  assert.ok(titleSimilarityScore('Solo Leveling', 'Solo Leveling') > 0.9);

  const results = [
    { id: '1', providerId: 'mangadex', title: 'One Piece' },
    { id: '1', providerId: 'mangadex', title: 'One Piece' }, // duplicate id & provider
    { id: '2', providerId: 'comick', title: 'One Piece' },
  ];

  const deduped = deduplicateSearchResults(results, 'One Piece');
  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].title, 'One Piece');
});
