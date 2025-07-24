import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-blue-50 dark:bg-emerald-950">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-blue-900 dark:text-white mb-2">404 Page Not Found</h1>
            <p className="text-sm text-muted-foreground mb-6">
              The page you're looking for doesn't exist or has been moved.
            </p>
            
            <Link href="/">
              <Button className="bg-blue-900 hover:bg-blue-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
