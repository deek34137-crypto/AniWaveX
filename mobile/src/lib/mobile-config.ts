export const REMOTE_API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://aniwavex.bond'
).replace(/\/+$/, '');

export function isNativeMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.origin.includes('localhost') ||
    window.location.protocol === 'capacitor:' ||
    (window as any).Capacitor?.isNativePlatform?.() === true
  );
}

export function resolveRemoteApiUrl(url: string): string {
  if (url.startsWith('/api/')) {
    return `${REMOTE_API_BASE_URL}${url}`;
  }
  return url;
}
