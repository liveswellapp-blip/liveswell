import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Location } from "@/types/weather";

interface AISurfSummaryProps {
  location: Location;
}

interface AISummaryResponse {
  summary: string;
  location: {
    name: string;
    region: string;
    country: string;
  };
  generatedAt: string;
}

export default function AISurfSummary({ location }: AISurfSummaryProps) {
  const { data, isLoading, error } = useQuery<AISummaryResponse>({
    queryKey: [`/api/locations/${location.id}/ai-summary`],
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden bg-[#030912]/80 border border-emerald-500/10 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-emerald-400/40 text-xs font-bold tracking-widest uppercase shrink-0">✦ AI</div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-full bg-white/5" />
                <Skeleton className="h-3.5 w-5/6 bg-white/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-2">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden bg-[#030912]/80 border border-emerald-500/10 px-5 py-4">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 20% 50%, #10b981 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, #0ea5e9 0%, transparent 60%)",
            }}
          />
          <div className="relative">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {data.summary}
            </p>
          </div>
          <div className="relative mt-3 flex items-center gap-1.5">
            <span className="text-[10px] text-slate-600">
              Updated {new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
