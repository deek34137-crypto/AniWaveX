import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAiringSchedule } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dayParam = searchParams.get("day");
    const dateParam = searchParams.get("date"); // YYYY-MM-DD

    const schedule = await getUnifiedAiringSchedule();

    let filtered = schedule;

    if (dayParam !== null && dayParam !== "all") {
      const dayNum = parseInt(dayParam, 10);
      if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
        filtered = filtered.filter((item) => item.dayOfWeek === dayNum);
      }
    } else if (dateParam) {
      // Normalize to YYYY-MM-DD in UTC to prevent server local timezone off-by-one errors
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        const targetIsoDate = parsed.toISOString().split("T")[0];
        filtered = filtered.filter((item) => {
          const itemIsoDate = new Date(item.airingAt * 1000).toISOString().split("T")[0];
          return itemIsoDate === targetIsoDate;
        });
      }
    }

    return NextResponse.json(
      {
        count: filtered.length,
        schedule: filtered,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    console.error("Schedule API error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve airing schedule", details: error?.message },
      { status: 500 }
    );
  }
}
