interface FooterProps {
  hideSupport?: boolean;
}

export default function Footer({ hideSupport = false }: FooterProps) {
  return (
    <footer className="bg-white dark:bg-black text-[#1e3a8a] dark:text-white py-8 lg:py-6 mt-12 lg:mt-8 border-t border-gray-300 dark:border-gray-600">
      <div className="container mx-auto px-6">
        <div className="text-center text-[#1e3a8a] dark:text-gray-400 text-sm">
          <p>
            &copy; 2024 LiveSwell. All rights reserved. Data provided by OpenWeatherMap and marine weather services.
          </p>
        </div>
      </div>
    </footer>
  );
}
