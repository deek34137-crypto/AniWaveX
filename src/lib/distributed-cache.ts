/**
 * Distributed Cache adapter supporting Upstash Redis REST API,
 * Cloudflare KV HTTP API, or falling back seamlessly to local BoundedLRU in-memory.
 */

import { BoundedLRU } from './lru-cache';

interface CacheStorage {
  get(key: string): Promise<any | null>;
  set(key: string, value: any, ttlSeconds: number): Promise<void>;
}

class UpstashRedisStorage implements CacheStorage {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, '');
    this.token = token;
  }

  async get(key: string): Promise<any | null> {
    try {
      const res = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${this.token}` },
        signal: AbortSignal.timeout(1200),
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.result) return null;
      return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await fetch(`${this.url}/set/${encodeURIComponent(key)}/${encodeURIComponent(serialized)}?ex=${ttlSeconds}`, {
        headers: { Authorization: `Bearer ${this.token}` },
        signal: AbortSignal.timeout(1200),
      });
    } catch {
      // Graceful degradation
    }
  }
}

class CloudflareKVStorage implements CacheStorage {
  private accountId: string;
  private namespaceId: string;
  private apiToken: string;

  constructor(accountId: string, namespaceId: string, apiToken: string) {
    this.accountId = accountId;
    this.namespaceId = namespaceId;
    this.apiToken = apiToken;
  }

  async get(key: string): Promise<any | null> {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}/values/${encodeURIComponent(key)}`,
        {
          headers: { Authorization: `Bearer ${this.apiToken}` },
          signal: AbortSignal.timeout(1200),
        }
      );
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}/values/${encodeURIComponent(key)}?expiration_ttl=${ttlSeconds}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(value),
          signal: AbortSignal.timeout(1200),
        }
      );
    } catch {
      // Graceful degradation
    }
  }
}

class HybridDistributedCache {
  private localL1: BoundedLRU<any>;
  private distributedL2: CacheStorage | null = null;

  constructor(maxLocal = 250) {
    this.localL1 = new BoundedLRU(maxLocal);

    // 1. Check Upstash Redis credentials
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (upstashUrl && upstashToken) {
      this.distributedL2 = new UpstashRedisStorage(upstashUrl, upstashToken);
      return;
    }

    // 2. Check Cloudflare KV credentials
    const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfKvNamespace = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    if (cfAccount && cfKvNamespace && cfToken) {
      this.distributedL2 = new CloudflareKVStorage(cfAccount, cfKvNamespace, cfToken);
    }
  }

  async get(key: string): Promise<any | null> {
    // Check L1 Local LRU (sub-millisecond)
    const localHit = this.localL1.get(key);
    if (localHit) return localHit;

    // Check Distributed L2
    if (this.distributedL2) {
      const remoteHit = await this.distributedL2.get(key);
      if (remoteHit) {
        // Backfill local L1 cache
        this.localL1.set(key, remoteHit, 180 * 1000);
        return remoteHit;
      }
    }

    return null;
  }

  async set(key: string, value: any, ttlSeconds = 180): Promise<void> {
    // Write to L1
    this.localL1.set(key, value, ttlSeconds * 1000);

    // Write to Distributed L2
    if (this.distributedL2) {
      await this.distributedL2.set(key, value, ttlSeconds);
    }
  }

  delete(key: string): void {
    this.localL1.delete(key);
  }
}

export const distributedStreamCache = new HybridDistributedCache(250);
