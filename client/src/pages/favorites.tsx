import { useLocation, Link } from "wouter";
import Header from "@/components/Header";
import { Location } from "@/types/weather";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Favorites() {
  return (
    <div className="min-h-screen bg-blue-50 dark:bg-[hsl(155,50%,8%)]">
      <Header />
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4 text-emerald-400">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          <div className="flex items-center space-x-3 mb-2">
            <Heart className="h-8 w-8 text-emerald-400" />
            <h1 className="text-3xl font-bold text-emerald-400">Saved Spots</h1>
          </div>
          <p className="text-slate-300">Your favorite surf locations</p>
        </div>

        <div className="grid gap-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-emerald-400">
                <Heart className="h-5 w-5 mr-2" />
                Favorites Not Available
              </CardTitle>
              <CardDescription>
                User authentication is currently disabled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                Saving favorite spots requires user authentication. The app is currently configured to work without login.
              </p>
              <p className="text-slate-400 text-sm">
                You can still browse and view conditions for all surf spots from the home page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}