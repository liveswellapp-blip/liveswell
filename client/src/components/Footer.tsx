interface FooterProps {
  hideSupport?: boolean;
}

export default function Footer({ hideSupport = false }: FooterProps) {
  return (
    <footer className="bg-white dark:bg-black text-[#1e3a8a] dark:text-white py-8 mt-12 border-t border-gray-300 dark:border-gray-600">
      <div className="container mx-auto px-4">
        <div className="text-center text-[#1e3a8a] dark:text-gray-400 text-sm space-y-3">
          <p>
            &copy; 2024 LiveSwell. All rights reserved. Data provided by OpenWeatherMap and marine weather services.
          </p>
          {!hideSupport && (
            <div>
              <a 
                href="https://buymeacoffee.com/liveswell" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors duration-200 font-medium"
                data-testid="buy-me-coffee-link"
              >
                ☕ Buy me coffee!
              </a>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
