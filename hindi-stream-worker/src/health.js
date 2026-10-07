/**
 * Provider Circuit Breaker & Health Tracking
 */

class HealthManager {
  constructor() {
    this.metrics = new Map();
    this.FAILURE_THRESHOLD = 3;
    this.COOLDOWN_MS = 60 * 1000; // 60s cooldown
  }

  recordSuccess(providerId, latencyMs = 0) {
    const m = this.getOrCreate(providerId);
    m.successes++;
    m.consecutiveFailures = 0;
    m.isCircuitOpen = false;
    m.lastSuccessAt = Date.now();
    m.avgLatencyMs = m.avgLatencyMs === 0 ? latencyMs : Math.round(m.avgLatencyMs * 0.7 + latencyMs * 0.3);
  }

  recordFailure(providerId, error = null) {
    const m = this.getOrCreate(providerId);
    m.failures++;
    m.consecutiveFailures++;
    m.lastFailureAt = Date.now();
    m.lastError = error ? (typeof error === 'string' ? error : error.message) : 'Unknown error';

    if (m.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      m.isCircuitOpen = true;
    }
  }

  isAvailable(providerId) {
    const m = this.metrics.get(providerId);
    if (!m) return true;
    if (!m.isCircuitOpen) return true;
    if (Date.now() - m.lastFailureAt > this.COOLDOWN_MS) {
      return true; // Test half-open window
    }
    return false;
  }

  getStats() {
    const result = {};
    for (const [provider, data] of this.metrics.entries()) {
      result[provider] = {
        ...data,
        isCircuitOpen: data.isCircuitOpen && Date.now() - data.lastFailureAt <= this.COOLDOWN_MS,
      };
    }
    return result;
  }

  getOrCreate(providerId) {
    let m = this.metrics.get(providerId);
    if (!m) {
      m = {
        successes: 0,
        failures: 0,
        consecutiveFailures: 0,
        lastSuccessAt: 0,
        lastFailureAt: 0,
        lastError: null,
        avgLatencyMs: 0,
        isCircuitOpen: false,
      };
      this.metrics.set(providerId, m);
    }
    return m;
  }
}

export const healthManager = new HealthManager();
