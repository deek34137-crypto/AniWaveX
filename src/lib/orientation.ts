import { ScreenOrientation } from '@capacitor/screen-orientation';

export function callNativeScreenOrientation(action: 'lock' | 'unlock', orientation: string = 'landscape'): boolean {
  if (typeof window === 'undefined') return false;

  // Direct window.androidBridge interface injected by Capacitor BridgeActivity
  try {
    const bridge = (window as any)?.androidBridge;
    if (bridge && typeof bridge.postMessage === 'function') {
      const payload = {
        callbackId: String(Date.now()),
        pluginId: "ScreenOrientation",
        methodName: action,
        options: action === 'lock' ? { orientation } : {}
      };
      bridge.postMessage(JSON.stringify(payload));
      return true;
    }
  } catch (e) {
    console.warn('[AniWaveX] direct androidBridge error:', e);
  }

  return false;
}

export async function lockToLandscape(): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Direct native androidBridge postMessage (highest priority in Android APK, 100% reliable)
  callNativeScreenOrientation('lock', 'landscape');

  // 2. Official Capacitor ScreenOrientation plugin
  try {
    await ScreenOrientation.lock({ orientation: 'landscape' });
    return;
  } catch {
    try {
      await ScreenOrientation.lock({ orientation: 'landscape-primary' });
      return;
    } catch {}
  }

  // 3. Dynamic window.Capacitor.Plugins.ScreenOrientation
  try {
    const capPlugin = (window as any)?.Capacitor?.Plugins?.ScreenOrientation;
    if (capPlugin?.lock) {
      await capPlugin.lock({ orientation: 'landscape' });
      return;
    }
  } catch {
    try {
      const capPlugin = (window as any)?.Capacitor?.Plugins?.ScreenOrientation;
      if (capPlugin?.lock) {
        await capPlugin.lock({ orientation: 'landscape-primary' });
        return;
      }
    } catch {}
  }

  // 4. Capacitor nativePromise fallback
  try {
    const cap = (window as any)?.Capacitor;
    if (cap?.nativePromise) {
      await cap.nativePromise('ScreenOrientation', 'lock', { orientation: 'landscape' });
      return;
    }
  } catch {}

  // 5. Standard W3C Screen Orientation API
  try {
    const orientation = window.screen?.orientation;
    if (orientation && typeof (orientation as any).lock === 'function') {
      await (orientation as any).lock('landscape').catch(async () => {
        await (orientation as any).lock('landscape-primary').catch(() => {});
      });
      return;
    }
  } catch {}

  // 6. Vendor-prefixed legacy Screen Orientation APIs
  try {
    const s = window.screen as any;
    if (s?.lockOrientation) {
      s.lockOrientation('landscape') || s.lockOrientation('landscape-primary');
      return;
    }
    if (s?.mozLockOrientation) {
      s.mozLockOrientation('landscape') || s.mozLockOrientation('landscape-primary');
      return;
    }
    if (s?.msLockOrientation) {
      s.msLockOrientation('landscape') || s.msLockOrientation('landscape-primary');
      return;
    }
  } catch {}
}

export async function unlockFromLandscape(): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Direct native androidBridge
  callNativeScreenOrientation('unlock');

  // 2. Official Capacitor plugin
  try {
    await ScreenOrientation.unlock();
  } catch {}

  // 3. Dynamic window.Capacitor
  try {
    const capPlugin = (window as any)?.Capacitor?.Plugins?.ScreenOrientation;
    if (capPlugin?.unlock) {
      await capPlugin.unlock();
    }
  } catch {}

  // 4. Capacitor nativePromise
  try {
    const cap = (window as any)?.Capacitor;
    if (cap?.nativePromise) {
      await cap.nativePromise('ScreenOrientation', 'unlock', {});
    }
  } catch {}

  // 5. Web Screen Orientation API
  try {
    if (window.screen?.orientation && typeof window.screen.orientation.unlock === 'function') {
      window.screen.orientation.unlock();
    }
  } catch {}

  // 6. Vendor prefixes
  try {
    const s = window.screen as any;
    if (s?.unlockOrientation) s.unlockOrientation();
    if (s?.mozUnlockOrientation) s.mozUnlockOrientation();
    if (s?.msUnlockOrientation) s.msUnlockOrientation();
  } catch {}
}
