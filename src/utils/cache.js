class MemoryCache {
  /**
   * @param {number} ttlMs - 캐시 항목 만료 시간 (ms)
   * @param {number} [maxSize=500] - 최대 저장 개수 (초과 시 가장 오래된 항목 제거)
   */
  constructor(ttlMs, maxSize = 500) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // LRU: 접근된 항목을 Map 끝으로 이동
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    // 이미 존재하면 삭제 후 재삽입 (순서 갱신)
    this.store.delete(key);

    // 최대 크기 초과 시 가장 오래된 항목(Map 첫 번째)부터 제거
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  // 만료된 항목 일괄 정리
  purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  get size() {
    return this.store.size;
  }
}

module.exports = { MemoryCache };
