import { NextResponse } from "next/server";
import { searchAnime } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 5, 20) : 5;

  if (!query.trim()) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchAnime(query.trim(), limit);
    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
      }
    });
  } catch (error) {
    console.error("Search API route error:", error);
    return NextResponse.json({ error: "Failed to search anime" }, { status: 500 });
  }
}
