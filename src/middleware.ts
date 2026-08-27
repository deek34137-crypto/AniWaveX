import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/proxy (streaming video proxy segments)
     * - api/stream (stream resolution)
     * - api/heartbeat (telemetry heartbeat pings)
     * - static formats (.svg, .png, .jpg, .jpeg, .gif, .webp, .m3u8, .ts, .vtt)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/proxy|api/stream|api/heartbeat|.*\\.(?:svg|png|jpg|jpeg|gif|webp|m3u8|ts|vtt)$).*)',
  ],
};

