import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingScreenProps {
  type?: 'page' | 'conditions' | 'minimal';
  className?: string;
}

export function LoadingScreen({ type = 'page', className = '' }: LoadingScreenProps) {
  if (type === 'minimal') {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-emerald-500 rounded-full animate-pulse"></div>
          <div className="w-6 h-6 bg-emerald-400 rounded-full animate-pulse delay-100"></div>
          <div className="w-6 h-6 bg-emerald-300 rounded-full animate-pulse delay-200"></div>
        </div>
      </div>
    );
  }

  if (type === 'conditions') {
    return (
      <div className={`container mx-auto px-4 pt-8 ${className}`}>
        {/* Location Header Skeleton */}
        <div className="flex items-center space-x-3 mb-6">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div>
            <Skeleton className="w-48 h-8 mb-2" />
            <Skeleton className="w-32 h-5" />
          </div>
        </div>

        {/* Current Conditions Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Waves Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-xl shadow-lg border border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="w-12 h-5" />
                <Skeleton className="w-6 h-6 rounded" />
              </div>
              <Skeleton className="w-20 h-10 mb-2" />
              <Skeleton className="w-16 h-4 mb-1" />
              <Skeleton className="w-12 h-4" />
            </CardContent>
          </Card>

          {/* Wind Card */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-xl shadow-lg border border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="w-12 h-5" />
                <Skeleton className="w-6 h-6 rounded" />
              </div>
              <Skeleton className="w-20 h-10 mb-2" />
              <Skeleton className="w-16 h-4 mb-1" />
              <Skeleton className="w-12 h-4" />
            </CardContent>
          </Card>

          {/* Tide Card */}
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="w-12 h-5" />
                <Skeleton className="w-6 h-6 rounded" />
              </div>
              <Skeleton className="w-20 h-10 mb-2" />
              <Skeleton className="w-16 h-4" />
            </CardContent>
          </Card>

          {/* Sun Card */}
          <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950 rounded-xl shadow-lg border border-orange-200 dark:border-orange-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="w-12 h-5" />
                <Skeleton className="w-6 h-6 rounded" />
              </div>
              <Skeleton className="w-24 h-4 mb-2" />
              <Skeleton className="w-20 h-4" />
            </CardContent>
          </Card>

          {/* Water/UV Card */}
          <Card className="bg-gradient-to-br from-coral-50 to-orange-50 dark:from-coral-950 dark:to-orange-950 rounded-xl shadow-lg border border-coral-200 dark:border-coral-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="w-16 h-5" />
                <Skeleton className="w-6 h-6 rounded" />
              </div>
              <Skeleton className="w-20 h-10 mb-2" />
              <Skeleton className="w-20 h-4" />
            </CardContent>
          </Card>
        </div>

        {/* Additional sections skeleton */}
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card rounded-xl shadow-lg border border-border">
              <CardContent className="p-6">
                <Skeleton className="w-32 h-6 mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="text-center">
                      <Skeleton className="w-12 h-4 mb-2 mx-auto" />
                      <Skeleton className="w-16 h-8 mb-1 mx-auto" />
                      <Skeleton className="w-10 h-3 mx-auto" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Full page loading
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Header Skeleton */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="w-32 h-8" />
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-8">
        {/* Loading Animation */}
        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
            <div className="w-4 h-4 bg-emerald-400 rounded-full animate-pulse delay-100"></div>
            <div className="w-4 h-4 bg-emerald-300 rounded-full animate-pulse delay-200"></div>
          </div>
          <p className="text-muted-foreground animate-pulse">Loading surf conditions...</p>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-card rounded-xl shadow-lg border border-border">
              <CardContent className="p-6">
                <Skeleton className="w-full h-48 mb-4 rounded" />
                <Skeleton className="w-3/4 h-6 mb-2" />
                <Skeleton className="w-1/2 h-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;