import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userAgent = req.headers.get("user-agent") || "";
    let browser = "Web Browser";
    let os = "Unknown OS";
    let device = "Desktop Device";

    if (/Mobile|Android|iPhone/i.test(userAgent)) {
      device = "Mobile Device";
    }
    if (/Android/i.test(userAgent)) os = "Android";
    else if (/iPhone|iPad/i.test(userAgent)) os = "iOS";
    else if (/Windows/i.test(userAgent)) os = "Windows";
    else if (/Macintosh|Mac OS/i.test(userAgent)) os = "macOS";
    else if (/Linux/i.test(userAgent)) os = "Linux";

    if (/Chrome/i.test(userAgent)) browser = "Chrome";
    else if (/Firefox/i.test(userAgent)) browser = "Firefox";
    else if (/Safari/i.test(userAgent)) browser = "Safari";
    else if (/Edge/i.test(userAgent)) browser = "Edge";

    // Single active verified session model with option to invalidate others
    const currentSession = {
      id: "current-session",
      device,
      browser,
      os,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "Local Device",
      last_active: new Date().toISOString(),
      is_current: true,
    };

    return NextResponse.json({
      sessions: [currentSession],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope"); // 'all' | 'others'

    if (scope === "others") {
      await supabase.auth.signOut({ scope: "others" });
      return NextResponse.json({ success: true, message: "Signed out of all other devices." });
    } else {
      await supabase.auth.signOut({ scope: "global" });
      return NextResponse.json({ success: true, message: "Signed out everywhere." });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to sign out devices" }, { status: 500 });
  }
}
