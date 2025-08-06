import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Waves, MapPin, TrendingUp, Star } from "lucide-react";
import logoImageDark from "@assets/LiveSwell logo (6)_1753469985642.png";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950 dark:to-blue-950">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-64 h-16">
              <img 
                src={logoImageDark} 
                alt="LiveSwell" 
                className="h-16 object-contain mx-auto"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Real-time surf conditions and weather forecasts for coastal locations worldwide.
            Make informed decisions with comprehensive marine data from NOAA and OpenWeather.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-emerald-600" />
                218+ Surf Spots
              </CardTitle>
              <CardDescription>
                Comprehensive global database with coverage across 6 continents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                From California beaches to Hawaiian breaks, explore surf conditions worldwide with authentic NOAA marine data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                Real-time Data
              </CardTitle>
              <CardDescription>
                Live conditions from 1,355+ NOAA monitoring stations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Wave heights, wind speeds, tide times, and marine weather updated in real-time from official sources.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2 text-amber-600" />
                Personal Favorites
              </CardTitle>
              <CardDescription>
                Save and track your favorite surf locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Build your personalized dashboard with quick access to the spots you surf most.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Login Section */}
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Access real-time surf conditions and personalized forecasts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLogin} className="w-full" size="lg">
                Sign in with Replit
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Secure authentication powered by Replit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Data sources: NOAA National Data Buoy Center • OpenWeatherMap • Tides and Currents API</p>
        </div>
      </div>
    </div>
  );
}