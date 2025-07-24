import { Settings, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { Link } from "wouter";
import logoImageDark from "@assets/LiveSwell logo (4)_1753367615325.png";
import logoImageLight from "@assets/LiveSwell logo (5)_1753367759720.png";

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-background shadow-lg sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative w-48 h-12">
              {/* Blue logo for light mode */}
              <img 
                src={logoImageLight} 
                alt="LiveSwell" 
                className="absolute top-0 left-0 h-12 dark:hidden object-contain object-left"
                style={{ imageRendering: 'auto' }}
              />
              {/* Green logo for dark mode */}
              <img 
                src={logoImageDark} 
                alt="LiveSwell" 
                className="absolute top-0 left-0 h-12 hidden dark:block object-contain object-left"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>
          


          {/* Theme Toggle and Settings */}
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="text-blue-900 dark:text-emerald-400 hover:text-blue-700 dark:hover:text-emerald-300"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-blue-900 dark:text-emerald-400 hover:text-blue-700 dark:hover:text-emerald-300">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
