import { TidePoint } from "@/types/weather";

interface SimpleTideChartProps {
  tides: TidePoint[];
}

export default function SimpleTideChart({ tides }: SimpleTideChartProps) {
  if (!tides || tides.length === 0) return null;

  const parseTimeToHours = (timeStr: string) => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const isPM = match[3].toUpperCase() === 'PM';
    
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    
    return hours + minutes / 60;
  };

  // Sort tides by time
  const sortedTides = tides.map(tide => ({
    ...tide,
    hour: parseTimeToHours(tide.time)
  })).sort((a, b) => a.hour - b.hour);

  // Create simple wave path
  const createWavePath = () => {
    const width = 60;
    const height = 20;
    const points = [];
    
    for (let i = 0; i <= width; i += 10) {
      const x = i;
      const y = height / 2 + Math.sin((i / width) * Math.PI * 2) * (height / 4);
      points.push(`${x},${y}`);
    }
    
    return `M ${points.join(' L ')}`;
  };

  return (
    <div className="w-full">
      {/* Mini wave visualization */}
      <div className="mb-1">
        <svg width="60" height="20" viewBox="0 0 60 20" className="w-full h-5">
          <path
            d={createWavePath()}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            className="opacity-70"
          />
        </svg>
      </div>
      
      {/* Next tide info */}
      {sortedTides.length > 0 && (
        <div className="text-xs text-center">
          <div className="text-emerald-600 dark:text-emerald-400 font-medium">
            {sortedTides[0].type}
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            {sortedTides[0].time.replace(/:\d{2}/, '')}
          </div>
        </div>
      )}
    </div>
  );
}