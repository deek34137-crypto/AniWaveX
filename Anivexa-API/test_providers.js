import assert from "node:assert";
import worker from "./index.js";
import { getEpisodes as justanimeEpisodes } from "./providers/justanime.js";
import { resolveProviders } from "./core/episode-strategy.js";

async function runTests() {
  console.log("==========================================");
  console.log("RUNNING ANIVEXA-API TEST SUITE");
  console.log("==========================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return (async () => {
      try {
        await fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
      } catch (err) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Error: ${err.message}`);
        failed++;
      }
    })();
  }

  // 1. Health check test
  await test("GET /health returns 200 OK with status ok", async () => {
    const req = new Request("http://localhost:4000/health");
    const res = await worker.fetch(req, {});
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "ok");
  });

  // 2. Provider registry verification
  await test("Root metadata includes only active providers (8) and excludes removed (6)", async () => {
    const req = new Request("http://localhost:4000/");
    const res = await worker.fetch(req, {});
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    
    const expected = [
      "reanime",
      "justanime",
      "anikoto",
      "animegg",
      "anineko",
      "anibd",
      "kaa",
      "animenosub"
    ];
    const removed = ["mkissa", "2dhive", "anidbapp", "anizone", "senshi", "animedunya"];

    assert.deepStrictEqual(data.providers.sort(), expected.sort());
    for (const r of removed) {
      assert.ok(!data.providers.includes(r), `Removed provider ${r} should not be in providers list`);
    }
  });

  // 3. Provider alias resolution
  await test("resolveProviders maps justanime, megaplay, and rejects removed providers", async () => {
    const { resolved, unknown } = resolveProviders(["justanime", "megaplay", "mkissa", "2dhive", "reanime"]);
    assert.ok(resolved.has("justanime"));
    assert.ok(resolved.has("reanime"));
    assert.ok(unknown.includes("mkissa"));
    assert.ok(unknown.includes("2dhive"));
  });

  // 4. JustAnime Episode Resolution for AniList ID 16498
  await test("JustAnime getEpisodes resolves episode list with sub/dub IDs (AniList 16498)", async () => {
    const result = await justanimeEpisodes(16498);
    assert.ok(result.meta);
    assert.strictEqual(result.meta.source, "justanime");
    assert.ok(Array.isArray(result.episodes?.sub));
    assert.ok(Array.isArray(result.episodes?.dub));
    assert.ok(result.episodes.sub.length > 0);
    assert.strictEqual(result.episodes.sub[0].number, 1);
    assert.strictEqual(result.episodes.sub[0].id, "watch/justanime/16498/sub/justanime-1");
  });

  // 5. JustAnime Live Stream Source Resolution (AniList 16498 / Ep 1)
  await test("GET /watch/justanime/16498/sub/justanime-1 returns valid HLS stream & subtitles", async () => {
    const req = new Request("http://localhost:4000/watch/justanime/16498/sub/justanime-1");
    const res = await worker.fetch(req, {});
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.anilistId, 16498);
    assert.strictEqual(data.episode, 1);
    assert.ok(Array.isArray(data.streams) && data.streams.length > 0);
    
    const firstStream = data.streams[0];
    assert.strictEqual(firstStream.type, "hls");
    assert.ok(firstStream.url.includes(".m3u8"));
    assert.strictEqual(firstStream.referer, "https://megaplay.buzz/");
    
    assert.ok(Array.isArray(data.subtitles));
    assert.ok(data.subtitles.length > 0);
    assert.ok(data.subtitles[0].url.startsWith("http"));
  });

  // 6. JustAnime Live Stream Source Resolution (AniList 21 / Ep 1)
  await test("GET /watch/justanime/21/sub/justanime-1 returns valid HLS stream (One Piece)", async () => {
    const req = new Request("http://localhost:4000/watch/justanime/21/sub/justanime-1");
    const res = await worker.fetch(req, {});
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.anilistId, 21);
    assert.strictEqual(data.episode, 1);
    assert.ok(Array.isArray(data.streams) && data.streams.length > 0);
    assert.ok(data.streams[0].url.includes(".m3u8"));
  });

  // 7. Error Handling for Invalid/Non-existent Episode
  await test("GET /watch/justanime/9999999/sub/justanime-999999 returns graceful error", async () => {
    const req = new Request("http://localhost:4000/watch/justanime/9999999/sub/justanime-999999");
    const res = await worker.fetch(req, {});
    assert.ok(res.status === 404 || res.status === 500);
    const data = await res.json();
    assert.ok(data.error);
  });

  console.log(`\n==========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
