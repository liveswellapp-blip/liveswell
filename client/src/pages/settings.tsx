import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/ThemeProvider";
import { ArrowLeft, User, Bell, Globe, Shield, Palette, MapPin } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState } from "react";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [units, setUnits] = useState("metric");
  const [language, setLanguage] = useState("en");
  const [defaultLocation, setDefaultLocation] = useState("");

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-emerald-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4 text-blue-900 dark:text-emerald-400">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold text-blue-900 dark:text-emerald-400 mb-2">Settings</h1>
          <p className="text-slate-600 dark:text-slate-300">Customize your LiveSwell experience</p>
        </div>

        <div className="grid gap-6 max-w-4xl">
          {/* Theme & Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-blue-900 dark:text-emerald-400">
                <Palette className="h-5 w-5 mr-2" />
                Theme & Appearance
              </CardTitle>
              <CardDescription>
                Customize how LiveSwell looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Dark Mode</Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Switch between light and dark themes
                  </div>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location & Units */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-blue-900 dark:text-emerald-400">
                <MapPin className="h-5 w-5 mr-2" />
                Location & Units
              </CardTitle>
              <CardDescription>
                Set your preferred location and measurement units
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultLocation">Default Location</Label>
                <Input
                  id="defaultLocation"
                  placeholder="Enter your preferred surf spot"
                  value={defaultLocation}
                  onChange={(e) => setDefaultLocation(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="units">Measurement Units</Label>
                <Select value={units} onValueChange={setUnits}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric (m, km/h, °C)</SelectItem>
                    <SelectItem value="imperial">Imperial (ft, mph, °F)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-blue-900 dark:text-emerald-400">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </CardTitle>
              <CardDescription>
                Manage your notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Push Notifications</Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Receive alerts for weather changes
                  </div>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Get daily surf reports via email
                  </div>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data & Refresh */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-blue-900 dark:text-emerald-400">
                <Globe className="h-5 w-5 mr-2" />
                Data & Refresh
              </CardTitle>
              <CardDescription>
                Control how and when data is updated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-refresh Data</Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Automatically update conditions every 30 seconds
                  </div>
                </div>
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-blue-900 dark:text-emerald-400">
                <Shield className="h-5 w-5 mr-2" />
                Privacy & Security
              </CardTitle>
              <CardDescription>
                Manage your privacy and data preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                Clear Cache & Data
              </Button>
              <Button variant="outline" className="w-full">
                Export Favorites
              </Button>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">App Version</Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">LiveSwell v1.0.0</p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <Link href="/">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-emerald-600 dark:hover:bg-emerald-700">
              Save Changes
            </Button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}