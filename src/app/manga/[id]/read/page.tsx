import MangaReaderClient from "@/components/manga/MangaReaderClient";
import { getMangaDetails, getMangaChapters } from "@/lib/manga/service";
import { notFound } from "next/navigation";

export default async function MangaReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chapterId?: string; ch?: string; page?: string }>;
}) {
  const { id } = await params;
  const sParams = await searchParams;

  // Retrieve manga details and chapter list server-side
  const manga = await getMangaDetails(id);
  if (!manga) {
    notFound();
  }

  const chapters = await getMangaChapters(manga.title, manga.id, manga.romajiTitle);

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
      chapterId={chapterId}
      chapterNumber={chapterNum}
      chapters={chapters}
      initialPage={initialPage}
    />
  );
}
