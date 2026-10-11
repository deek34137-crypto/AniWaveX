import MangaReaderClient from "@/components/manga/MangaReaderClient";
import { getMangaDetails, getMangaChapters } from "@/lib/manga/service";
import { notFound } from "next/navigation";
import { getAbsoluteUrl } from "@/lib/seo/site-config";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chapterId?: string; ch?: string; page?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sParams = await searchParams;
  const chNum = sParams.ch || "1";

  return {
    title: `Reading Chapter ${chNum} — AniWaveX`,
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: getAbsoluteUrl(`/manga/${id}`),
    },
  };
}

export default async function MangaReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chapterId?: string; ch?: string; page?: string }>;
}) {
  const { id } = await params;
  const sParams = await searchParams;

  // Retrieve manga details and chapter list server-side with fallback if offline / upstream unavailable
  let manga: any = null;
  let chapters: any[] = [];

  try {
    manga = await getMangaDetails(id);
    if (manga) {
      chapters = await getMangaChapters(manga.title, manga.id, manga.romajiTitle, manga.synonyms);
    }
  } catch (err) {
    console.warn("[MangaReaderPage] Upstream fetch failed, falling back to offline client reader:", err);
  }

  // Fallback manga placeholder if offline so client-side IndexedDB can take over
  if (!manga) {
    manga = {
      id,
      title: "Manga",
      posterImage: "",
    };
  }

  // Match requested chapter
  let chapterId = sParams.chapterId;
  let chapterNum = sParams.ch ? parseFloat(sParams.ch) : undefined;
  const initialPage = sParams.page ? parseInt(sParams.page, 10) : undefined;

  if (!chapterId && chapterNum !== undefined && chapters.length > 0) {
    const matched = chapters.find((c) => c.chapterNumber === chapterNum);
    if (matched) {
      chapterId = matched.id;
    }
  }

  // Fallback to first chapter if none specified or matched
  if (!chapterId && chapters.length > 0) {
    chapterId = chapters[0].id;
    chapterNum = chapters[0].chapterNumber;
  }

  chapterId = chapterId || sParams.ch || "1";
  chapterNum = chapterNum ?? (parseFloat(sParams.ch || "1") || 1);

  return (
    <MangaReaderClient
      mangaId={id}
      mangaTitle={manga?.title || "Manga"}
      posterImage={manga?.posterImage}
      romajiTitle={manga?.romajiTitle}
      synonyms={manga?.synonyms}
      chapterId={chapterId}
      chapterNumber={chapterNum}
      chapters={chapters}
      initialPage={initialPage}
    />
  );
}
