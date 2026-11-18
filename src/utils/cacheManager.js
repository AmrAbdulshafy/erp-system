/**
 * Universal Cache Manager for Jinn Worx ERP (Web & Desktop)
 * Safely clears browser HTTP caches, service workers, and Electron V8 session caches
 * while preserving mission-critical offline database records in IndexedDB & LocalStorage.
 */

export async function clearAppCache(options = {}) {
  const isDesktop = typeof window !== 'undefined' && !!window.jinnworxDesktop;
  const details = {
    isDesktop,
    desktopSessionCache: false,
    webCachesDeleted: 0,
    sessionStorageCleared: false
  };

  // 1. Clear Desktop Electron V8 Session Cache
  if (isDesktop && window.jinnworxDesktop?.clearCache) {
    try {
      const res = await window.jinnworxDesktop.clearCache();
      details.desktopSessionCache = res?.success ?? true;
    } catch (err) {
      console.warn('[CacheManager] Desktop cache clear error:', err);
    }
  }

  // 2. Clear Web Cache Storage (Service Workers & Assets)
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map(k => window.caches.delete(k)));
      details.webCachesDeleted = cacheKeys.length;
    } catch (err) {
      console.warn('[CacheManager] Web caches.delete error:', err);
    }
  }

  // 3. Clear temporary SessionStorage while preserving active auth session
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const savedAuth = window.sessionStorage.getItem('jin_engine_auth_user');
      window.sessionStorage.clear();
      if (savedAuth) {
        window.sessionStorage.setItem('jin_engine_auth_user', savedAuth);
      }
      details.sessionStorageCleared = true;
    } catch (err) {
      console.warn('[CacheManager] sessionStorage error:', err);
    }
  }

  // 4. Force Hard Reload if requested
  if (options.reload && typeof window !== 'undefined') {
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }

  return details;
}
