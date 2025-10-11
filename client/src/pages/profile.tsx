import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Profile() {
  return (
      <div className="min-h-screen bg-[hsl(155,50%,8%)]">
        <Header />
        
        <div className="container mx-auto px-6 py-8">
          {/* Back Navigation */}
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" className="mb-4 text-emerald-400">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            
            <div className="flex items-center space-x-3 mb-2">
              <User className="h-8 w-8 text-emerald-400" />
              <h1 className="text-3xl font-bold text-emerald-400">User Profile</h1>
            </div>
            <p className="text-slate-300">Manage your personal preferences and settings</p>
          </div>

          <div className="grid gap-6 max-w-4xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-emerald-400">
                    <User className="h-5 w-5 mr-2" />
                    Profile Not Available
                  </CardTitle>
                  <CardDescription>
                    User authentication is currently disabled
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-300">
                    Profile features require user authentication. The app is currently configured to work without login.
                  </p>
                  <p className="text-slate-400 text-sm">
                    You can still access all surf condition data and features from the home page.
                  </p>
                </CardContent>
              </Card>
          </div>
        </div>
        
        <Footer />
      </div>
  );
}