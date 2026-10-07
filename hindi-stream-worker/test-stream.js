/**
 * Stream Resolution Verification Script
 */
import worker from './index.js';

async function testStream() {
  console.log('Testing /stream endpoint for Hindi anime...');

  // Test 1: DesiDub stream resolution for a popular title
  try {
    const req = new Request('https://worker.local/stream?title=Demon%20Slayer&ep=1');
    const res = await worker.fetch(req, {}, {});
    const data = await res.json();
    console.log('Demon Slayer Ep 1 Response:', {
      status: res.status,
      success: data.success,
      provider: data.provider,
      stream_url: data.stream_url ? data.stream_url.slice(0, 60) + '...' : null,
      streamsCount: data.streams?.length,
      sampleStream: data.streams?.[0] ? {
        server: data.streams[0].server,
        type: data.streams[0].type,
        quality: data.streams[0].quality,
        isM3U8: data.streams[0].isM3U8,
        isHindi: data.streams[0].isHindi,
      } : null,
    });
  } catch (err) {
    console.error('Demon Slayer Ep 1 error:', err);
  }

  // Test 2: Jujutsu Kaisen Ep 1
  try {
    const req = new Request('https://worker.local/stream?title=Jujutsu%20Kaisen&ep=1');
    const res = await worker.fetch(req, {}, {});
    const data = await res.json();
    console.log('Jujutsu Kaisen Ep 1 Response:', {
      status: res.status,
      success: data.success,
      provider: data.provider,
      stream_url: data.stream_url ? data.stream_url.slice(0, 60) + '...' : null,
      streamsCount: data.streams?.length,
      sampleStream: data.streams?.[0] ? {
        server: data.streams[0].server,
        type: data.streams[0].type,
        quality: data.streams[0].quality,
        isM3U8: data.streams[0].isM3U8,
        isHindi: data.streams[0].isHindi,
      } : null,
    });
  } catch (err) {
    console.error('Jujutsu Kaisen Ep 1 error:', err);
  }
}

testStream().catch(console.error);
