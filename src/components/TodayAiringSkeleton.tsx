import { Calendar } from "lucide-react";

export default function TodayAiringSkeleton() {
  return (
    <section className="w-full mt-8 mb-6 group/row relative animate-pulse">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="h-7 w-36 bg-slate-800/60 rounded-lg" />
        </div>
      </div>
      <div className="flex overflow-hidden gap-3.5 sm:gap-5 pb-4 px-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-[140px] sm:w-[175px] md:w-[200px] lg:w-[230px] aspect-[2/3] bg-slate-900/60 border border-white/5 rounded-2xl"
          />
        ))}
      </div>
    </section>
  );
}
