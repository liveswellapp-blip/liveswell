import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Shield, LogOut } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { useAuth } from "@/hooks/useAuth";

export default function Profile() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
      <div className="min-h-screen bg-[hsl(155,50%,8%)]">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
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
              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-emerald-400">
                    <User className="h-5 w-5 mr-2" />
                    Account Information
                  </CardTitle>
                  <CardDescription>
                    Your account details and basic information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Email Address</Label>
                    <Input
                      value={user?.email || ""}
                      disabled
                      className="bg-slate-800 border-slate-700 text-slate-400"
                    />
                    <p className="text-sm text-slate-500">Email cannot be changed</p>
                  </div>
                </CardContent>
              </Card>








              {/* Account Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-emerald-400">
                    <Shield className="h-5 w-5 mr-2" />
                    Account Actions
                  </CardTitle>
                  <CardDescription>
                    Manage your account and session
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleLogout}
                    variant="outline" 
                    className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out of Account
                  </Button>
                  
                  <Separator className="bg-slate-700" />
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-300">App Version</Label>
                    <p className="text-sm text-slate-400">LiveSwell v1.0.0</p>
                  </div>
                </CardContent>
              </Card>

          </div>
        </div>
        
        <Footer />
      </div>
  );
}