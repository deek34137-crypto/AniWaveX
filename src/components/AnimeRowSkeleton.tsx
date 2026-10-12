export default function AnimeRowSkeleton({ title }: { title?: string }) {
  return (
    <div className="w-full mt-10 mb-6 group/row relative animate-pulse">
      <div className="flex items-center justify-between mb-4 px-2">
        {title ? (
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-700 tracking-tight">
            {title}
          </h2>
        ) : (
          <div className="h-7 w-36 bg-slate-800/60 rounded-lg" />
        )}
      </div>
      <div className="flex overflow-hidden gap-3.5 sm:gap-5 pb-4 px-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-[140px] sm:w-[175px] md:w-[200px] lg:w-[230px] xl:w-[250px] 2xl:w-[270px] aspect-[2/3] bg-slate-900/60 border border-white/5 rounded-2xl"
          />
        ))}
      </div>
    </div>
  );
}
