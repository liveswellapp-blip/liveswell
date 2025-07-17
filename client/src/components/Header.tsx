import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="font-bold ocean-blue text-[14px] text-[#4087f1]">LIVESWELL</h1>
          </div>
          


          {/* Settings */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="ocean-blue hover:sky-blue">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
