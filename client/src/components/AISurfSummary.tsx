import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, AlertCircle } from "lucide-react";
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
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    retry: 1, // Only retry once if it fails
  });

  if (isLoading) {
    return (
      <Card className="mb-8 bg-gradient-to-br from-emerald-50/50 to-blue-50/50 dark:from-emerald-950/20 dark:to-blue-950/20 border-emerald-200 dark:border-emerald-800" data-testid="card-ai-summary-loading">
        <CardContent className="pt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-8 bg-gradient-to-br from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800" data-testid="card-ai-summary-error">
        <CardContent className="pt-6">
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Unable to generate AI surf summary at this time. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card className="mb-8 bg-gradient-to-br from-emerald-50/50 to-blue-50/50 dark:from-emerald-950/20 dark:to-blue-950/20 border-emerald-200 dark:border-emerald-800" data-testid="card-ai-summary">
      <CardContent className="pt-6">
        <div 
          className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-3 whitespace-pre-line"
          data-testid="text-ai-summary-content"
        >
          {data.summary}
        </div>
        <div className="mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1" data-testid="text-ai-generated-timestamp">
            <Sparkles className="w-3 h-3" />
            AI-generated report • Updated {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
