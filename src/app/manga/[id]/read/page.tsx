import MangaReaderClient from "@/components/manga/MangaReaderClient";

export default async function MangaReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chapterId?: string; ch?: string }>;
}) {
  const { id } = await params;
  const sParams = await searchParams;
  const chapterId = sParams.chapterId || sParams.ch || "1";
  const chapterNum = parseFloat(sParams.ch || "1") || 1;

  return (
    <MangaReaderClient
      mangaId={id}
      chapterId={chapterId}
      chapterNumber={chapterNum}
    />
  );
}
