import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, Home } from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
          </div>
          <div className="flex items-center space-x-2">
            
            <Button
              variant={location === "/favorites" ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link href="/favorites">
                <Heart className="h-4 w-4 mr-2" />
                Favorites
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}