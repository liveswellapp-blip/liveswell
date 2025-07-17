import { TidePoint } from "@/types/weather";

interface TideChartProps {
  tides: TidePoint[];
  date: string;
}

export default function TideChart({ tides, date }: TideChartProps) {
  // Convert tide times to hours for interpolation
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

  // Generate hourly tide data using actual tide points for interpolation
  const generateTideData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    // Convert tide points to hours with their heights
    const tidePoints = tides.map(tide => ({
      hour: parseTimeToHours(tide.time),
      height: tide.height,
      type: tide.type
    })).sort((a, b) => a.hour - b.hour);
    
    const tideData = hours.map(hour => {
      // Find the two closest tide points for interpolation
      let beforeTide = tidePoints[tidePoints.length - 1]; // Default to last tide (wraps around)
      let afterTide = tidePoints[0]; // Default to first tide
      
      for (let i = 0; i < tidePoints.length; i++) {
        if (tidePoints[i].hour <= hour) {
          beforeTide = tidePoints[i];
        }
        if (tidePoints[i].hour > hour) {
          afterTide = tidePoints[i];
          break;
        }
      }
      
      // Handle wrapping around midnight
      let timeDiff, heightDiff, interpolationFactor;
      if (beforeTide.hour > afterTide.hour) {
        // Wraps around midnight
        const totalTime = (24 - beforeTide.hour) + afterTide.hour;
        const currentTime = hour >= beforeTide.hour ? (hour - beforeTide.hour) : (24 - beforeTide.hour + hour);
        interpolationFactor = currentTime / totalTime;
      } else {
        timeDiff = afterTide.hour - beforeTide.hour;
        interpolationFactor = timeDiff > 0 ? (hour - beforeTide.hour) / timeDiff : 0;
      }
      
      // Use cubic interpolation for smoother tide curves
      const t = Math.max(0, Math.min(1, interpolationFactor));
      const smoothT = t * t * (3 - 2 * t); // Smooth step function
      
      heightDiff = afterTide.height - beforeTide.height;
      const interpolatedHeight = beforeTide.height + heightDiff * smoothT;
      
      return {
        hour,
        height: interpolatedHeight,
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

  // Use the actual tide data passed from the server
  const majorTides = tides.map(tide => ({
    hour: parseTimeToHours(tide.time),
    height: tide.height,
    time: tide.time,
    type: tide.type
  }));

  // Calculate current time position for the indicator line (only for today)
  const getCurrentTimePosition = () => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    return (currentHour / 24) * 100; // Convert to percentage of 24-hour day
  };

  const currentTimeX = getCurrentTimePosition();
  
  // Only show time indicator for today's chart
  const isToday = date === "today" || date === "Today";

  return (
    <div className="mt-3 p-3 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700 dark:text-emerald-300">Tides</span>
        <span className="text-xs text-gray-500 dark:text-emerald-400">24hr</span>
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
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" className="dark:hidden" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.1" className="dark:hidden" />
            </linearGradient>
            <linearGradient id={`tideGradientDark-${date}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.1" />
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
            className="dark:hidden"
            stroke="none"
          />
          <path
            d={`${createTidePath()} L 100,40 L 0,40 Z`}
            fill={`url(#tideGradientDark-${date})`}
            className="hidden dark:block"
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
            className="dark:hidden"
          />
          <path
            d={createTidePath()}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hidden dark:block"
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
          
          {/* Current time indicator line - only show for today */}
          {isToday && (
            <>
              <line
                x1={currentTimeX}
                y1="0"
                x2={currentTimeX}
                y2="40"
                stroke="#2563eb"
                strokeWidth="1.5"
                opacity="0.8"
                className="dark:hidden"
              />
              <line
                x1={currentTimeX}
                y1="0"
                x2={currentTimeX}
                y2="40"
                stroke="#10b981"
                strokeWidth="1.5"
                opacity="0.8"
                className="hidden dark:block"
              />
              
              {/* Current time marker dot */}
              <circle
                cx={currentTimeX}
                cy="2"
                r="2"
                fill="#2563eb"
                stroke="white"
                strokeWidth="1"
                className="dark:hidden"
              />
              <circle
                cx={currentTimeX}
                cy="2"
                r="2"
                fill="#10b981"
                stroke="white"
                strokeWidth="1"
                className="hidden dark:block"
              />
            </>
          )}
        </svg>
        
        {/* Time labels */}
        <div className="flex justify-between text-xs text-gray-400 dark:text-emerald-500 mt-1">
          <span>12a</span>
          <span>6a</span>
          <span>12p</span>
          <span>6p</span>
          <span>12a</span>
        </div>
      </div>
      
      {/* AM and PM tide times */}
      <div className="space-y-1">
        {/* AM Tides */}
        <div className="text-xs">
          <div className="font-medium text-gray-700 dark:text-emerald-300 mb-1">AM</div>
          <div className="grid grid-cols-2 gap-1">
            {majorTides
              .filter(tide => tide.time.includes('AM'))
              .map((tide, index) => (
                <div key={`am-${index}`} className="flex items-center">
                  <div 
                    className={`w-2 h-2 rounded-full mr-1 ${
                      tide.type === 'high' ? 'bg-red-500' : 'bg-green-600'
                    }`}
                  />
                  <span className="text-gray-600 dark:text-emerald-400">
                    {tide.type === 'high' ? 'H' : 'L'} {tide.time} ({tide.height.toFixed(1)}ft)
                  </span>
                </div>
              ))}
          </div>
        </div>
        
        {/* PM Tides */}
        <div className="text-xs">
          <div className="font-medium text-gray-700 dark:text-emerald-300 mb-1">PM</div>
          <div className="grid grid-cols-2 gap-1">
            {majorTides
              .filter(tide => tide.time.includes('PM'))
              .map((tide, index) => (
                <div key={`pm-${index}`} className="flex items-center">
                  <div 
                    className={`w-2 h-2 rounded-full mr-1 ${
                      tide.type === 'high' ? 'bg-red-500' : 'bg-green-600'
                    }`}
                  />
                  <span className="text-gray-600 dark:text-emerald-400">
                    {tide.type === 'high' ? 'H' : 'L'} {tide.time} ({tide.height.toFixed(1)}ft)
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}