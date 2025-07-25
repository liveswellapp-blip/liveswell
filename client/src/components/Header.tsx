import { Settings, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import logoImageDark from "@assets/LiveSwell logo (6)_1753469985642.png";

export default function Header() {
  return (
    <header className="bg-background shadow-lg sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative w-48 h-12">
              {/* Dark mode logo only */}
              <img 
                src={logoImageDark} 
                alt="LiveSwell" 
                className="h-12 object-contain object-left"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>
          
          {/* Navigation buttons */}
          <div className="flex items-center space-x-4">
            <Link href="/monitoring">
              <Button variant="ghost" size="icon" className="text-white hover:text-gray-200" title="System Monitoring">
                <Activity className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-white hover:text-gray-200" title="Settings">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
