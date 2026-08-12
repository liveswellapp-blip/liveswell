import { useState } from "react";
import { Wind, Waves, CloudRain, Thermometer } from "lucide-react";

type Layer = "wind" | "waves" | "rain" | "temp";

interface LayerOption {
  id: Layer;
  label: string;
  icon: React.ElementType;
  windyOverlay: string;
}

const LAYERS: LayerOption[] = [
  { id: "wind",  label: "Wind",  icon: Wind,        windyOverlay: "wind" },
  { id: "waves", label: "Waves", icon: Waves,        windyOverlay: "waves" },
  { id: "rain",  label: "Rain",  icon: CloudRain,    windyOverlay: "rain" },
  { id: "temp",  label: "Temp",  icon: Thermometer,  windyOverlay: "temp" },
];

interface SpotMapProps {
  lat: string | number;
  lon: string | number;
  name: string;
}

function buildWindyUrl(lat: string | number, lon: string | number, overlay: string): string {
  const params = new URLSearchParams({
    type: "map",
    location: "coordinates",
    metricRain: "default",
    metricTemp: "default",
    metricWind: "default",
    zoom: "9",
    overlay,
    product: "ecmwf",
    level: "surface",
    lat: String(lat),
    lon: String(lon),
  });
  return `https://embed.windy.com/embed.html?${params.toString()}`;
}

export default function SpotMap({ lat, lon, name }: SpotMapProps) {
  const [activeLayer, setActiveLayer] = useState<Layer>("wind");

  const currentLayer = LAYERS.find(l => l.id === activeLayer)!;
  const iframeSrc = buildWindyUrl(lat, lon, currentLayer.windyOverlay);

  return (
    <div className="w-full">
      {/* Layer picker */}
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold shrink-0">Layer</span>
          <div className="flex gap-1.5">
            {LAYERS.map(layer => {
              const Icon = layer.icon;
              const isActive = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                    isActive
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {layer.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Map iframe */}
      <div className="max-w-2xl mx-auto px-3 pb-4">
        <div
          className="relative w-full overflow-hidden rounded-xl border border-white/[0.08]"
          style={{ minHeight: "400px", height: "calc(100dvh - 220px)", maxHeight: "700px" }}
        >
          <iframe
            key={activeLayer}
            src={iframeSrc}
            title={`${name} — ${currentLayer.label} map`}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
          />
        </div>
        <p className="text-slate-600 text-[10px] text-right mt-1.5">
          Powered by <a href="https://windy.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">Windy.com</a>
        </p>
      </div>
    </div>
  );
}
