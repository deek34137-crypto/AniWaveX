import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

// Initialize backend Supabase client for analytics
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createAdminClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      // Handle sendBeacon plain text payload
      const rawText = await request.text();
      if (rawText) {
        try {
          body = JSON.parse(rawText);
        } catch {
          body = {};
        }
      }
    }

    const { visitorId, userId, currentPath, deviceType } = body;

    if (!visitorId || typeof visitorId !== "string") {
      return NextResponse.json({ error: "Missing visitorId" }, { status: 400 });
    }

    // Sanitize userId to ensure it is a valid UUID before sending to PostgreSQL
    const isValidUuid = typeof userId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId.trim());
    const sanitizedUserId = isValidUuid ? userId.trim() : null;

    // Call stored procedure to upsert heartbeat atomically
    const { error } = await supabase.rpc("record_heartbeat", {
      p_visitor_id: visitorId.slice(0, 100),
      p_user_id: sanitizedUserId,
      p_current_path: (currentPath || "/").slice(0, 200),
      p_device_type: (deviceType || "desktop").slice(0, 30),
    });

    if (error) {
      console.error("Failed to record heartbeat:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Heartbeat POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to process heartbeat" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verify caller has admin permission
    let user: any = null;
    try {
      const serverSupabase = await createServerClient();
      const { data } = await serverSupabase.auth.getUser();
      user = data?.user || null;
    } catch {
      user = null;
    }

    const { searchParams } = new URL(request.url);
    const keyParam = searchParams.get("key");
    const keyHeader = request.headers.get("x-admin-key");
    const adminKey = process.env.ADMIN_KEY || process.env.ADMIN_SECRET;

    const hasKeyAccess = Boolean(adminKey && (keyParam === adminKey || keyHeader === adminKey));
    const hasAdminSession = isAdminUser(user);

    // If caller is not an admin, return public concurrent count without 403 error
    // to keep client badges responsive and avoid console errors while keeping analytics private.
    if (!hasAdminSession && !hasKeyAccess) {
      let concurrentUsers = 1;
      try {
        const { data: count, error: countErr } = await supabase.rpc("get_concurrent_users_count");
        if (!countErr && typeof count === "number") {
          concurrentUsers = Math.max(1, count);
        }
      } catch {
        concurrentUsers = 1;
      }

      return NextResponse.json(
        { concurrentUsers },
        {
          headers: {
            "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
          },
        }
      );
    }

    // Use authenticated serverSupabase client (transmits admin JWT) or service_role key for admin key access
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const serverSupabase = await createServerClient();
    const clientToQuery = (hasKeyAccess && serviceRoleKey)
      ? createAdminClient(supabaseUrl, serviceRoleKey)
      : serverSupabase;

    const { data, error } = await clientToQuery.rpc("get_heartbeat_analytics");

    if (error) {
      console.error("Failed to fetch heartbeat analytics:", error);
      return NextResponse.json(
        {
          concurrentUsers: 1,
          dailyUniqueUsers: 0,
          totalUniqueUsers: 0,
          topPages: [],
          dailyTrend: [],
          error: error.message,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(data || {}, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Heartbeat GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve analytics" },
      { status: 500 }
    );
  }
}
