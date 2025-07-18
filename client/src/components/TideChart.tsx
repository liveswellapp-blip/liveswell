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

  // Generate high-resolution tide data for precise curve and marker alignment
  const generateTideData = () => {
    // Create high-resolution data points (every 10 minutes = 144 points per day)
    const resolution = 144;
    const timeStep = 24 / resolution;
    const times = Array.from({ length: resolution }, (_, i) => i * timeStep);
    
    // Convert tide points to hours with their heights
    const tidePoints = tides.map(tide => ({
      hour: parseTimeToHours(tide.time),
      height: tide.height,
      type: tide.type
    })).sort((a, b) => a.hour - b.hour);
    
    const getHeightAtTime = (time: number) => {
      // Check if this time matches exactly with a tide point
      const exactMatch = tidePoints.find(tide => Math.abs(tide.hour - time) < 0.01);
      if (exactMatch) {
        return exactMatch.height;
      }
      
      // Find the two closest tide points for interpolation
      let beforeTide = tidePoints[tidePoints.length - 1]; // Default to last tide (wraps around)
      let afterTide = tidePoints[0]; // Default to first tide
      
      for (let i = 0; i < tidePoints.length; i++) {
        if (tidePoints[i].hour <= time) {
          beforeTide = tidePoints[i];
        }
        if (tidePoints[i].hour > time) {
          afterTide = tidePoints[i];
          break;
        }
      }
      
      // Handle wrapping around midnight
      let timeDiff, heightDiff, interpolationFactor;
      if (beforeTide.hour > afterTide.hour) {
        // Wraps around midnight
        const totalTime = (24 - beforeTide.hour) + afterTide.hour;
        const currentTime = time >= beforeTide.hour ? (time - beforeTide.hour) : (24 - beforeTide.hour + time);
        interpolationFactor = currentTime / totalTime;
      } else {
        timeDiff = afterTide.hour - beforeTide.hour;
        interpolationFactor = timeDiff > 0 ? (time - beforeTide.hour) / timeDiff : 0;
      }
      
      // Use cosine interpolation for smooth tide curves that pass through exact points
      const t = Math.max(0, Math.min(1, interpolationFactor));
      const cosineT = (1 - Math.cos(t * Math.PI)) / 2;
      
      heightDiff = afterTide.height - beforeTide.height;
      return beforeTide.height + heightDiff * cosineT;
    };
    
    const tideData = times.map(time => ({
      hour: time,
      height: getHeightAtTime(time),
      time: `${Math.floor(time).toString().padStart(2, '0')}:${Math.floor((time % 1) * 60).toString().padStart(2, '0')}`
    }));
    
    return tideData;
  };

  const hourlyData = generateTideData();
  const maxHeight = Math.max(...hourlyData.map(d => d.height));
  const minHeight = Math.min(...hourlyData.map(d => d.height));
  const heightRange = maxHeight - minHeight;

  // Create SVG path for tide curve
  const createTidePath = () => {
    const width = 100; // SVG viewBox width
    const height = 50; // SVG viewBox height
    
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
    <div className="mt-4 p-4 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-lg">
      
      {/* Tide Chart SVG */}
      <div className="relative mb-4">
        <svg 
          viewBox="0 0 100 50" 
          className="w-full h-24 overflow-visible"
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
          <g stroke="#e5e7eb" strokeWidth="0.3" opacity="0.4" className="dark:stroke-emerald-700">
            <line x1="0" y1="12.5" x2="100" y2="12.5" />
            <line x1="0" y1="25" x2="100" y2="25" />
            <line x1="0" y1="37.5" x2="100" y2="37.5" />
          </g>
          
          {/* Tide curve area */}
          <path
            d={`${createTidePath()} L 100,50 L 0,50 Z`}
            fill={`url(#tideGradient-${date})`}
            className="dark:hidden"
            stroke="none"
          />
          <path
            d={`${createTidePath()} L 100,50 L 0,50 Z`}
            fill={`url(#tideGradientDark-${date})`}
            className="hidden dark:block"
            stroke="none"
          />
          
          {/* Tide curve line */}
          <path
            d={createTidePath()}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:hidden"
          />
          <path
            d={createTidePath()}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hidden dark:block"
          />
          
          {/* High and Low tide vertical lines */}
          {majorTides.map((tide, index) => {
            // Find the closest data point in our high-resolution interpolated data
            const closestDataPoint = hourlyData.reduce((closest, point) => {
              const currentDistance = Math.abs(point.hour - tide.hour);
              const closestDistance = Math.abs(closest.hour - tide.hour);
              return currentDistance < closestDistance ? point : closest;
            });
            
            // Use the interpolated curve's coordinate system
            const dataPointIndex = hourlyData.indexOf(closestDataPoint);
            const x = (dataPointIndex / (hourlyData.length - 1)) * 100;
            
            // Calculate where the line intersects the curve
            const normalizedHeight = ((closestDataPoint.height - minHeight) / heightRange);
            const curveY = 50 - (normalizedHeight * 50);
            
            return (
              <g key={`tide-line-${index}`}>
                {/* Vertical line from bottom to curve */}
                <line
                  x1={x}
                  y1={curveY}
                  x2={x}
                  y2="50"
                  stroke="#2563eb"
                  strokeWidth="1"
                  opacity="0.7"
                  className="dark:hidden"
                />
                <line
                  x1={x}
                  y1={curveY}
                  x2={x}
                  y2="50"
                  stroke="#10b981"
                  strokeWidth="1"
                  opacity="0.7"
                  className="hidden dark:block"
                />
                
                {/* Background rectangle for better text readability */}
                <rect
                  x={x - 8}
                  y={curveY - 10}
                  width="16"
                  height="8"
                  rx="1.5"
                  fill="#ffffff"
                  fillOpacity="0.95"
                  stroke="#2563eb"
                  strokeWidth="0.4"
                  className="dark:hidden"
                />
                <rect
                  x={x - 8}
                  y={curveY - 10}
                  width="16"
                  height="8"
                  rx="1.5"
                  fill="#0f172a"
                  fillOpacity="0.95"
                  stroke="#10b981"
                  strokeWidth="0.4"
                  className="hidden dark:block"
                />
                
                {/* Tide time label above the curve */}
                <text
                  x={x}
                  y={curveY - 4}
                  textAnchor="middle"
                  fontSize="3.5"
                  fill="#2563eb"
                  className="dark:hidden font-bold"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {tide.time}
                </text>
                <text
                  x={x}
                  y={curveY - 4}
                  textAnchor="middle"
                  fontSize="3.5"
                  fill="#10b981"
                  className="hidden dark:block font-bold"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {tide.time}
                </text>
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
                y2="50"
                stroke="#2563eb"
                strokeWidth="1.5"
                opacity="0.8"
                className="dark:hidden"
              />
              <line
                x1={currentTimeX}
                y1="0"
                x2={currentTimeX}
                y2="50"
                stroke="#10b981"
                strokeWidth="1.5"
                opacity="0.8"
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
      
      {/* Tide Schedule */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-2">
          {majorTides.map((tide, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-white/50 dark:bg-emerald-950/30 rounded-md">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-emerald-300">
                  {tide.type === 'high' ? 'High' : 'Low'} Tide
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900 dark:text-emerald-200">
                  {tide.time}
                </div>
                <div className="text-xs text-gray-500 dark:text-emerald-400">
                  {tide.height.toFixed(1)} ft
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}