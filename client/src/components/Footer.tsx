import { Facebook, Twitter, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-black text-[#1e3a8a] dark:text-white py-8 mt-12 border-t border-gray-300 dark:border-gray-600">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold text-[#1e3a8a] dark:sky-blue mb-4">SurfCast</h4>
            <p className="text-[#1e3a8a] dark:text-gray-300 text-sm">
              Real-time surf conditions and forecasts for coastal cities worldwide.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-[#1e3a8a] dark:sky-blue mb-4">Features</h4>
            <ul className="text-[#1e3a8a] dark:text-gray-300 text-sm space-y-2">
              <li>Live Wave Data</li>
              <li>Tide Charts</li>
              <li>Wind Conditions</li>
              <li>Marine Weather</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[#1e3a8a] dark:sky-blue mb-4">Resources</h4>
            <ul className="text-[#1e3a8a] dark:text-gray-300 text-sm space-y-2">
              <li>Surf Reports</li>
              <li>Weather API</li>
              <li>Mobile App</li>
              <li>Help Center</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[#1e3a8a] dark:sky-blue mb-4">Connect</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-[#1e3a8a] dark:text-gray-300 hover:text-blue-700 dark:hover:sky-blue transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-[#1e3a8a] dark:text-gray-300 hover:text-blue-700 dark:hover:sky-blue transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-[#1e3a8a] dark:text-gray-300 hover:text-blue-700 dark:hover:sky-blue transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-300 dark:border-gray-600 mt-8 pt-8 text-center text-[#1e3a8a] dark:text-gray-400 text-sm">
          <p>
            &copy; 2024 SurfCast. All rights reserved. Data provided by OpenWeatherMap and marine weather services.
          </p>
        </div>
      </div>
    </footer>
  );
}
