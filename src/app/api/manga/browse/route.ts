import { NextRequest, NextResponse } from "next/server";
import { filterMangaList } from "@/lib/manga/service";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category") || "all";
  const search = searchParams.get("q") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 24;

  try {
    const data = await filterMangaList({ category, search, limit });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to browse manga catalog" },
      { status: 500 }
    );
  }
}
