import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Bell, Globe, Shield, MapPin, Save } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ProtectedRoute from "@/components/ProtectedRoute";
import React from "react";

const profileSchema = z.object({
  defaultLocation: z.string().optional(),
  units: z.enum(["metric", "imperial"]).default("metric"),
  language: z.enum(["en", "es", "fr", "pt"]).default("en"),
  pushNotifications: z.boolean().default(true),
  emailNotifications: z.boolean().default(false),
  autoRefresh: z.boolean().default(true),
  refreshInterval: z.number().min(5).max(300).default(30),
  theme: z.enum(["light", "dark"]).default("dark"),
});

type ProfileData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const response = await fetch("/api/profile");
      if (!response.ok) {
        if (response.status === 404) {
          // No profile exists yet, return defaults
          return {
            defaultLocation: "",
            units: "metric",
            language: "en",
            pushNotifications: true,
            emailNotifications: false,
            autoRefresh: true,
            refreshInterval: 30,
            theme: "dark",
          };
        }
        throw new Error("Failed to fetch profile");
      }
      return response.json();
    },
  });

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile || {
      defaultLocation: "",
      units: "metric",
      language: "en",
      pushNotifications: true,
      emailNotifications: false,
      autoRefresh: true,
      refreshInterval: 30,
      theme: "dark",
    },
  });

  // Update form when profile data loads
  React.useEffect(() => {
    if (profile) {
      form.reset(profile);
    }
  }, [profile, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Profile Updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[hsl(155,50%,8%)]">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-white">Loading profile...</div>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 max-w-4xl">
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

              {/* Location & Units */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-emerald-400">
                    <MapPin className="h-5 w-5 mr-2" />
                    Location & Units
                  </CardTitle>
                  <CardDescription>
                    Set your preferred location and measurement units
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="defaultLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Default Location</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your preferred surf spot"
                            className="bg-slate-800 border-slate-700 text-white"
                            data-testid="input-default-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="units"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Measurement Units</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                              <SelectValue placeholder="Select units" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="metric">Metric (m, km/h, °C)</SelectItem>
                              <SelectItem value="imperial">Imperial (ft, mph, °F)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-emerald-400">
                    <Bell className="h-5 w-5 mr-2" />
                    Notifications
                  </CardTitle>
                  <CardDescription>
                    Manage your notification preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="pushNotifications"
                    render={({ field }) => (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base text-slate-300">Push Notifications</Label>
                          <div className="text-sm text-slate-400">
                            Receive alerts for weather changes
                          </div>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-push-notifications"
                        />
                      </div>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="emailNotifications"
                    render={({ field }) => (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base text-slate-300">Email Notifications</Label>
                          <div className="text-sm text-slate-400">
                            Get daily surf reports via email
                          </div>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-email-notifications"
                        />
                      </div>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Data & Refresh */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-emerald-400">
                    <Globe className="h-5 w-5 mr-2" />
                    Data & Refresh
                  </CardTitle>
                  <CardDescription>
                    Control how and when data is updated
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="autoRefresh"
                    render={({ field }) => (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base text-slate-300">Auto-refresh Data</Label>
                          <div className="text-sm text-slate-400">
                            Automatically update conditions
                          </div>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-auto-refresh"
                        />
                      </div>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="refreshInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Refresh Interval (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="5"
                            max="300"
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            className="bg-slate-800 border-slate-700 text-white"
                            data-testid="input-refresh-interval"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Language</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                              <SelectItem value="fr">French</SelectItem>
                              <SelectItem value="pt">Portuguese</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Theme & Display */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-emerald-400">
                    <Shield className="h-5 w-5 mr-2" />
                    Theme & Display
                  </CardTitle>
                  <CardDescription>
                    Customize the app appearance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Theme</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                              <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dark">Dark Mode</SelectItem>
                              <SelectItem value="light">Light Mode</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator className="bg-slate-700" />
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-300">App Version</Label>
                    <p className="text-sm text-slate-400">LiveSwell v1.0.0</p>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end space-x-4">
                <Link href="/">
                  <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}