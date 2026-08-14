interface FooterProps {
  hideSupport?: boolean;
}

export default function Footer({ hideSupport = false }: FooterProps) {
  return (
    <footer className="bg-white dark:bg-black text-[#1e3a8a] dark:text-white py-8 mt-12 border-t border-gray-300 dark:border-gray-600">
      <div className="container mx-auto px-6">
        <div className="text-center text-[#1e3a8a] dark:text-gray-400 text-sm space-y-2">
          <p className="text-[11px]">
            &copy; 2024 LiveSwell. All rights reserved. Data provided by OpenWeatherMap and marine weather services.
          </p>
          <p className="text-[11px] flex items-center justify-center gap-3">
            <a href="/pricing" className="underline hover:opacity-70 transition-opacity">Pricing</a>
            <span className="opacity-30">·</span>
            <a href="/terms" className="underline hover:opacity-70 transition-opacity">Terms of Service</a>
            <span className="opacity-30">·</span>
            <a href="/privacy" className="underline hover:opacity-70 transition-opacity">Privacy Policy</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
