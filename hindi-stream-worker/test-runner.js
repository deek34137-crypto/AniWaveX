/**
 * Verification & Test Suite for Hindi Streaming Worker
 */
import { toonstreamProvider } from './src/providers/toonstream.js';
import { desidubProvider } from './src/providers/desidub.js';
import { providerRegistry } from './src/registry.js';
import { healthManager } from './src/health.js';
import { unpackPacked, extractM3u8FromText } from './src/utils/unpacker.js';
import { isAllowedProxyUrl } from './src/proxy.js';
import worker from './index.js';

async function runTests() {
  console.log('=== STARTING TEST SUITE FOR HINDI STREAMING WORKER ===\n');
  const results = [];

  // Test 1: Dean Edwards Unpacker
  try {
    const packedSample = `eval(function(p,a,c,k,e,d){e=function(c){return c.toString(36)};if(!''.replace(/^/,String)){while(c--){d[c.toString(a)]=k[c]||c.toString(a)}k=[function(e){return d[e]}];e=function(){return'\\\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c])}}return p}('1 0="3://2.4/5.6";',7,7,'file|var|cdn|https|example|master|m3u8'.split('|'),0,{}))`;
    const unpacked = unpackPacked(packedSample);
    const m3u8 = extractM3u8FromText(unpacked);
    const pass = m3u8 === 'https://cdn.example/master.m3u8';
    console.log(`[TEST 1] Dean Edwards Unpacker: ${pass ? 'PASSED' : 'FAILED'} (Extracted: ${m3u8})`);
    results.push({ test: 'Dean Edwards Unpacker', pass });
  } catch (err) {
    console.error('[TEST 1] Error:', err);
    results.push({ test: 'Dean Edwards Unpacker', pass: false, error: err.message });
  }

  // Test 2: Proxy Allowlist & SSRF Protection
  try {
    const validCdn = isAllowedProxyUrl('https://vidmoly.biz/video.m3u8');
    const validRuby = isAllowedProxyUrl('https://rubyvidhub.com/master.m3u8');
    const blockedLocalhost = isAllowedProxyUrl('http://localhost:8080/admin');
    const blockedPrivateIp = isAllowedProxyUrl('http://192.168.1.1/secret');
    const blocked127 = isAllowedProxyUrl('http://127.0.0.1:8787/proxy');

    const pass = validCdn && validRuby && !blockedLocalhost && !blockedPrivateIp && !blocked127;
    console.log(`[TEST 2] Proxy Security & SSRF Protection: ${pass ? 'PASSED' : 'FAILED'}`);
    results.push({ test: 'Proxy Security & SSRF Protection', pass });
  } catch (err) {
    console.error('[TEST 2] Error:', err);
    results.push({ test: 'Proxy Security & SSRF Protection', pass: false, error: err.message });
  }

  // Test 3: Search on ToonStream
  try {
    const searchRes = await toonstreamProvider.search('Naruto');
    const pass = Array.isArray(searchRes) && searchRes.length > 0;
    console.log(`[TEST 3] ToonStream Search ('Naruto'): ${pass ? 'PASSED' : 'FAILED'} (Found: ${searchRes.length} items)`);
    results.push({ test: 'ToonStream Search', pass, count: searchRes.length });
  } catch (err) {
    console.warn('[TEST 3] ToonStream Search Warning:', err.message);
    results.push({ test: 'ToonStream Search', pass: false, error: err.message });
  }

  // Test 4: Search on DesiDub
  try {
    const searchRes = await desidubProvider.search('Demon Slayer');
    const pass = Array.isArray(searchRes) && searchRes.length > 0;
    console.log(`[TEST 4] DesiDub Search ('Demon Slayer'): ${pass ? 'PASSED' : 'FAILED'} (Found: ${searchRes.length} items)`);
    results.push({ test: 'DesiDub Search', pass, count: searchRes.length });
  } catch (err) {
    console.warn('[TEST 4] DesiDub Search Warning:', err.message);
    results.push({ test: 'DesiDub Search', pass: false, error: err.message });
  }

  // Test 5: Aggregated Search across Registry
  try {
    const combined = await providerRegistry.searchAll('Jujutsu Kaisen');
    const pass = Array.isArray(combined) && combined.length > 0;
    console.log(`[TEST 5] Aggregated Search across Registry ('Jujutsu Kaisen'): ${pass ? 'PASSED' : 'FAILED'} (Found: ${combined.length} items)`);
    results.push({ test: 'Aggregated Search', pass, count: combined.length });
  } catch (err) {
    console.error('[TEST 5] Error:', err);
    results.push({ test: 'Aggregated Search', pass: false, error: err.message });
  }

  // Test 6: Episode List Resolution
  try {
    // Test episode listing for a known slug on ToonStream
    const searchItems = await toonstreamProvider.search('Naruto');
    if (searchItems.length > 0) {
      const epList = await toonstreamProvider.getEpisodes(searchItems[0].slug);
      const pass = Array.isArray(epList) && epList.length > 0;
      console.log(`[TEST 6] ToonStream Episode Listing (${searchItems[0].slug}): ${pass ? 'PASSED' : 'FAILED'} (Count: ${epList.length})`);
      results.push({ test: 'ToonStream Episodes', pass, count: epList.length });
    }
  } catch (err) {
    console.warn('[TEST 6] ToonStream Episode Listing Warning:', err.message);
    results.push({ test: 'ToonStream Episodes', pass: false, error: err.message });
  }

  // Test 7: Worker Fetch Endpoint - Health
  try {
    const req = new Request('https://worker.local/health');
    const res = await worker.fetch(req, {}, {});
    const data = await res.json();
    const pass = res.status === 200 && data.status === 'ok' && Array.isArray(data.activeProviders) && data.activeProviders.length === 2;
    console.log(`[TEST 7] Worker /health endpoint: ${pass ? 'PASSED' : 'FAILED'} (Active Providers: ${data.activeProviders?.map(p => p.id).join(', ')})`);
    results.push({ test: 'Worker /health', pass });
  } catch (err) {
    console.error('[TEST 7] Error:', err);
    results.push({ test: 'Worker /health', pass: false, error: err.message });
  }

  // Test 8: Worker Fetch Endpoint - Search
  try {
    const req = new Request('https://worker.local/search?q=One%20Piece');
    const res = await worker.fetch(req, {}, {});
    const data = await res.json();
    const pass = res.status === 200 && data.success === true && Array.isArray(data.data);
    console.log(`[TEST 8] Worker /search endpoint: ${pass ? 'PASSED' : 'FAILED'} (Results: ${data.count})`);
    results.push({ test: 'Worker /search', pass });
  } catch (err) {
    console.error('[TEST 8] Error:', err);
    results.push({ test: 'Worker /search', pass: false, error: err.message });
  }

  // Test 9: Failover Simulation
  try {
    healthManager.recordFailure('toonstream', new Error('Simulated upstream timeout'));
    healthManager.recordFailure('toonstream', new Error('Simulated upstream timeout'));
    healthManager.recordFailure('toonstream', new Error('Simulated upstream timeout'));

    const isToonstreamAvail = healthManager.isAvailable('toonstream');
    const isDesidubAvail = healthManager.isAvailable('desidub');
    const pass = !isToonstreamAvail && isDesidubAvail;
    console.log(`[TEST 9] Circuit Breaker Failover Simulation: ${pass ? 'PASSED' : 'FAILED'} (Toonstream Tripped: ${!isToonstreamAvail}, DesiDub Ready: ${isDesidubAvail})`);
    results.push({ test: 'Circuit Breaker Failover', pass });

    // Reset health state
    healthManager.recordSuccess('toonstream', 200);
  } catch (err) {
    console.error('[TEST 9] Error:', err);
    results.push({ test: 'Circuit Breaker Failover', pass: false, error: err.message });
  }

  console.log('\n=== TEST SUITE SUMMARY ===');
  console.table(results);
}

runTests().catch(console.error);
