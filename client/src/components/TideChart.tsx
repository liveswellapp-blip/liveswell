import { TidePoint } from "@/types/weather";

interface TideChartProps {
  tides: TidePoint[];
  date: string;
}

export default function TideChart({ tides, date }: TideChartProps) {
  // Generate hourly tide data for smooth curve
  const generateTideData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const tideData = hours.map(hour => {
      // Find closest tide points to interpolate between
      const timeInHours = hour;
      
      // Simple sine wave simulation based on tide points
      const amplitude = 2.5; // Average tide range
      const offset = 2; // Mean tide level
      
      // Create realistic tide pattern (2 highs, 2 lows per day)
      const primaryTide = Math.sin((timeInHours * Math.PI) / 6.2) * amplitude;
      const secondaryTide = Math.sin((timeInHours * Math.PI) / 6.2 + Math.PI) * 0.3;
      
      return {
        hour,
        height: offset + primaryTide + secondaryTide,
        time: `${hour.toString().padStart(2, '0')}:00`
      };
    });
    
    return tideData;
  };

  const hourlyData = generateTideData();
  const maxHeight = Math.max(...hourlyData.map(d => d.height));
  const minHeight = Math.min(...hourlyData.map(d => d.height));
  const heightRange = maxHeight - minHeight;

  // Create SVG path for tide curve
  const createTidePath = () => {
    const width = 100; // SVG viewBox width
    const height = 40; // SVG viewBox height
    
    const points = hourlyData.map((point, index) => {
      const x = (index / (hourlyData.length - 1)) * width;
      const normalizedHeight = ((point.height - minHeight) / heightRange);
      const y = height - (normalizedHeight * height);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  // Get major tide events to display
  const getMajorTides = () => {
    const majorTides = [];
    
    // Find peaks and troughs
    for (let i = 1; i < hourlyData.length - 1; i++) {
      const prev = hourlyData[i - 1].height;
      const current = hourlyData[i].height;
      const next = hourlyData[i + 1].height;
      
      // High tide (peak)
      if (current > prev && current > next && current > (minHeight + heightRange * 0.7)) {
        majorTides.push({
          ...hourlyData[i],
          type: 'high' as const
        });
      }
      // Low tide (trough)
      else if (current < prev && current < next && current < (minHeight + heightRange * 0.3)) {
        majorTides.push({
          ...hourlyData[i],
          type: 'low' as const
        });
      }
    }
    
    return majorTides.slice(0, 4); // Limit to 4 major tides per day
  };

  const majorTides = getMajorTides();

  return (
    <div className="mt-3 p-3 bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700">Tides</span>
        <span className="text-xs text-gray-500">24hr</span>
      </div>
      
      {/* Tide Chart SVG */}
      <div className="relative mb-2">
        <svg 
          viewBox="0 0 100 40" 
          className="w-full h-8 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`tideGradient-${date}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <g stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5">
            <line x1="0" y1="10" x2="100" y2="10" />
            <line x1="0" y1="20" x2="100" y2="20" />
            <line x1="0" y1="30" x2="100" y2="30" />
          </g>
          
          {/* Tide curve area */}
          <path
            d={`${createTidePath()} L 100,40 L 0,40 Z`}
            fill={`url(#tideGradient-${date})`}
            stroke="none"
          />
          
          {/* Tide curve line */}
          <path
            d={createTidePath()}
            fill="none"
            stroke="#2563eb"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Major tide markers */}
          {majorTides.map((tide, index) => {
            const x = (tide.hour / 23) * 100;
            const normalizedHeight = ((tide.height - minHeight) / heightRange);
            const y = 40 - (normalizedHeight * 40);
            
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="1.5"
                  fill={tide.type === 'high' ? "#dc2626" : "#059669"}
                  stroke="white"
                  strokeWidth="0.5"
                />
              </g>
            );
          })}
        </svg>
        
        {/* Time labels */}
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>12a</span>
          <span>6a</span>
          <span>12p</span>
          <span>6p</span>
          <span>12a</span>
        </div>
      </div>
      
      {/* Major tide times */}
      <div className="grid grid-cols-2 gap-1">
        {majorTides.slice(0, 2).map((tide, index) => (
          <div key={index} className="text-xs flex items-center">
            <div 
              className={`w-2 h-2 rounded-full mr-1 ${
                tide.type === 'high' ? 'bg-red-500' : 'bg-green-600'
              }`}
            />
            <span className="text-gray-600">
              {tide.type === 'high' ? 'H' : 'L'} {tide.time} ({tide.height.toFixed(1)}ft)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}