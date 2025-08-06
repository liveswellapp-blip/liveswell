import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ArrowLeft, 
  Clock, 
  User, 
  Globe, 
  Code,
  RefreshCw
} from "lucide-react";

interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  endpoint?: string;
  method?: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  statusCode?: number;
  context?: any;
}

interface ErrorStats {
  total: number;
  byLevel: Record<string, number>;
  last24Hours: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}

interface ErrorLogsProps {
  onClose: () => void;
}

export default function ErrorLogs({ onClose }: ErrorLogsProps) {
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [limit] = useState(100);
  const [offset] = useState(0);

  // Fetch error statistics
  const { data: errorStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<ErrorStats>({
    queryKey: ['/api/admin/error-stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch error logs with filtering
  const { data: errorLogsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery<{
    logs: ErrorLog[];
    total: number;
  }>({
    queryKey: ['/api/admin/error-logs', selectedLevel === "all" ? undefined : selectedLevel, limit, offset],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRefresh = () => {
    refetchStats();
    refetchLogs();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'warning';
      case 'info':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Error Detail Modal
  if (selectedLog) {
    return (
      <Dialog open={true} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {getLevelIcon(selectedLog.level)}
              <span>Error Details</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Error Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Level:</span>
                    <div className="mt-1">
                      <Badge variant={getLevelColor(selectedLog.level) as any} className="capitalize">
                        {selectedLog.level}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Timestamp:</span>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDate(selectedLog.timestamp)}
                    </p>
                  </div>
                  {selectedLog.endpoint && (
                    <div>
                      <span className="font-medium">Endpoint:</span>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center">
                        <Code className="h-4 w-4 mr-1" />
                        {selectedLog.method} {selectedLog.endpoint}
                      </p>
                    </div>
                  )}
                  {selectedLog.statusCode && (
                    <div>
                      <span className="font-medium">Status Code:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedLog.statusCode}
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <span className="font-medium">Message:</span>
                  <p className="text-sm text-muted-foreground mt-1 bg-muted p-3 rounded">
                    {selectedLog.message}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* User & Request Info */}
            {(selectedLog.userId || selectedLog.ip || selectedLog.userAgent) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedLog.userId && (
                    <div>
                      <span className="font-medium flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        User ID:
                      </span>
                      <p className="text-sm text-muted-foreground">{selectedLog.userId}</p>
                    </div>
                  )}
                  {selectedLog.ip && (
                    <div>
                      <span className="font-medium flex items-center">
                        <Globe className="h-4 w-4 mr-1" />
                        IP Address:
                      </span>
                      <p className="text-sm text-muted-foreground">{selectedLog.ip}</p>
                    </div>
                  )}
                  {selectedLog.userAgent && (
                    <div>
                      <span className="font-medium">User Agent:</span>
                      <p className="text-sm text-muted-foreground break-all">
                        {selectedLog.userAgent}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stack Trace */}
            {selectedLog.stack && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stack Trace</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-60">
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {selectedLog.stack}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Context */}
            {selectedLog.context && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Context</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.context, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main Error Logs View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Error Logs</h2>
          <p className="text-muted-foreground">Monitor application errors and warnings</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={onClose} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : errorStats?.byLevel?.error || 0}
            </div>
            <p className="text-sm text-muted-foreground flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Errors
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : errorStats?.byLevel?.warning || 0}
            </div>
            <p className="text-sm text-muted-foreground flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              Warnings
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : errorStats?.byLevel?.info || 0}
            </div>
            <p className="text-sm text-muted-foreground flex items-center">
              <Info className="h-4 w-4 mr-1" />
              Info Logs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : errorStats?.last24Hours || 0}
            </div>
            <p className="text-sm text-muted-foreground">Last 24 Hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Application Logs</CardTitle>
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Errors Only</SelectItem>
              <SelectItem value="warning">Warnings Only</SelectItem>
              <SelectItem value="info">Info Only</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-start space-x-4 p-4 border rounded">
                  <Skeleton className="h-6 w-6" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : errorLogsData && errorLogsData.logs.length > 0 ? (
            <div className="space-y-2">
              {errorLogsData.logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-4 border rounded hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedLog(log)}
                  data-testid={`error-log-${log.id}`}
                >
                  <div className="flex items-start space-x-3 flex-1">
                    {getLevelIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{log.message}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(log.timestamp)}
                        </span>
                        {log.endpoint && (
                          <span className="flex items-center">
                            <Code className="h-3 w-3 mr-1" />
                            {log.method} {log.endpoint}
                          </span>
                        )}
                        {log.statusCode && (
                          <Badge variant="outline" className="text-xs">
                            {log.statusCode}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant={getLevelColor(log.level) as any} className="capitalize">
                    {log.level}
                  </Badge>
                </div>
              ))}
              
              {errorLogsData.total > errorLogsData.logs.length && (
                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {errorLogsData.logs.length} of {errorLogsData.total} logs
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {selectedLevel === "all" ? 'No logs found' : `No ${selectedLevel} logs found`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Error Endpoints */}
      {errorStats?.topEndpoints && errorStats.topEndpoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Problematic Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {errorStats.topEndpoints.map((endpoint, index) => (
                <div key={endpoint.endpoint} className="flex items-center justify-between p-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{index + 1}</Badge>
                    <span className="font-mono text-sm">{endpoint.endpoint}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {endpoint.count} errors
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}