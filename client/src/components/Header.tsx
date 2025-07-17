import { Settings, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import logoImage from "@assets/LiveSwell logo_1752785462142.png";

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-background shadow-lg sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Text logo for light mode */}
            <h1 className="text-blue-900 text-[20px] font-bold dark:hidden">LiveSwell</h1>
            {/* Image logo for dark mode */}
            <img 
              src={logoImage} 
              alt="LiveSwell" 
              className="h-8 hidden dark:block"
            />
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
            <Button variant="ghost" size="icon" className="text-blue-900 dark:text-emerald-400 hover:text-blue-700 dark:hover:text-emerald-300">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
