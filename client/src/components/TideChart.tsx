import { TidePoint, Location } from "@/types/weather";
import { useState, useRef } from "react";

interface TideChartProps {
  tides: TidePoint[];
  date: string;
  location?: Location;
}

export default function TideChart({ tides, date, location }: TideChartProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTimeX, setDraggedTimeX] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
    if (!location) {
      // Fallback to browser time if no location provided
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      return (currentHour / 24) * 100;
    }
    
    // Get timezone for location
    const getLocationTimezone = (lat: number, lon: number): string => {
      // Pacific Time Zone (West Coast)
      if (lon >= -125 && lon <= -114 && lat >= 32 && lat <= 49) {
        return 'America/Los_Angeles';
      }
      // Mountain Time Zone
      if (lon >= -115 && lon <= -102 && lat >= 31 && lat <= 49) {
        return 'America/Denver';
      }
      // Central Time Zone
      if (lon >= -104 && lon <= -87 && lat >= 25 && lat <= 49) {
        return 'America/Chicago';
      }
      // Eastern Time Zone (East Coast and Gulf)
      if (lon >= -88 && lon <= -66 && lat >= 25 && lat <= 47) {
        return 'America/New_York';
      }
      return 'UTC';
    };
    
    const timezone = getLocationTimezone(parseFloat(location.latitude), parseFloat(location.longitude));
    const now = new Date();
    
    // Get current time in the location's timezone
    const timeInLocation = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const currentHour = timeInLocation.getHours() + timeInLocation.getMinutes() / 60;
    
    return (currentHour / 24) * 100; // Convert to percentage of 24-hour day
  };

  const currentTimeX = getCurrentTimePosition();
  
  // Only show time indicator for today's chart
  const isToday = date === "today" || date === "Today";

  // Get coordinates from touch/mouse event
  const getEventCoordinates = (e: TouchEvent | MouseEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX };
    }
    return { clientX: (e as MouseEvent).clientX };
  };

  // Convert screen coordinates to chart position
  const screenToChartPosition = (clientX: number) => {
    if (!svgRef.current) return 0;
    
    const rect = svgRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = (relativeX / rect.width) * 100;
    return Math.max(0, Math.min(100, percentage));
  };

  // Convert chart position to time and tide height
  const getTimeAndHeightAtPosition = (positionX: number) => {
    const hourOfDay = (positionX / 100) * 24;
    
    // Find the closest data point or interpolate
    const closestDataPoint = hourlyData.reduce((closest, point) => {
      const currentDistance = Math.abs(point.hour - hourOfDay);
      const closestDistance = Math.abs(closest.hour - hourOfDay);
      return currentDistance < closestDistance ? point : closest;
    });

    // Format time as 12-hour format
    const formatTime = (hour: number) => {
      const h = Math.floor(hour);
      const m = Math.floor((hour % 1) * 60);
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
    };

    return {
      time: formatTime(hourOfDay),
      height: closestDataPoint.height,
      hourOfDay
    };
  };

  // Touch/mouse event handlers
  const handleStart = (e: React.TouchEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    setIsDragging(true);
    
    const coords = getEventCoordinates(e.nativeEvent);
    const position = screenToChartPosition(coords.clientX);
    setDraggedTimeX(position);
  };

  const handleMove = (e: React.TouchEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const coords = getEventCoordinates(e.nativeEvent);
    const position = screenToChartPosition(coords.clientX);
    setDraggedTimeX(position);
  };

  const handleEnd = () => {
    setIsDragging(false);
    // Keep the dragged position visible for a moment, then fade out
    setTimeout(() => setDraggedTimeX(null), 2000);
  };

  // Determine which time position to show
  const activeTimeX = isDragging ? draggedTimeX ?? currentTimeX : (draggedTimeX !== null ? draggedTimeX : currentTimeX);
  const timeAndHeight = (isDragging || draggedTimeX !== null) && draggedTimeX !== null 
    ? getTimeAndHeightAtPosition(draggedTimeX) 
    : null;

  return (
    <div className="p-2 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-lg h-full flex flex-col justify-center">
      
      {/* Tide Chart SVG */}
      <div className="relative flex-1 h-16 md:h-auto">
        <svg 
          ref={svgRef}
          viewBox="0 0 100 50" 
          className="w-full h-full overflow-visible cursor-pointer"
          preserveAspectRatio="none"
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
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
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:hidden"
          />
          <path
            d={createTidePath()}
            fill="none"
            stroke="#10b981"
            strokeWidth="1"
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
                  strokeWidth="0.5"
                  opacity="0.7"
                  className="dark:hidden"
                />
                <line
                  x1={x}
                  y1={curveY}
                  x2={x}
                  y2="50"
                  stroke="#10b981"
                  strokeWidth="0.5"
                  opacity="0.7"
                  className="hidden dark:block"
                />
                

              </g>
            );
          })}

          {/* Hour tick marks on bottom x-axis */}
          {Array.from({ length: 25 }, (_, i) => {
            // Make 12am (0), 6am (6), 12pm (12), 6pm (18) longer
            const isMainHour = i === 0 || i === 6 || i === 12 || i === 18;
            const startY = isMainHour ? "46" : "48";
            
            return (
              <line
                key={`hour-tick-${i}`}
                x1={i * (100/24)}
                y1={startY}
                x2={i * (100/24)}
                y2="50"
                stroke="#2563eb"
                strokeWidth="0.3"
                opacity="0.6"
                className="dark:hidden"
              />
            );
          })}
          {Array.from({ length: 25 }, (_, i) => {
            // Make 12am (0), 6am (6), 12pm (12), 6pm (18) longer
            const isMainHour = i === 0 || i === 6 || i === 12 || i === 18;
            const startY = isMainHour ? "46" : "48";
            
            return (
              <line
                key={`hour-tick-dark-${i}`}
                x1={i * (100/24)}
                y1={startY}
                x2={i * (100/24)}
                y2="50"
                stroke="#10b981"
                strokeWidth="0.3"
                opacity="0.6"
                className="hidden dark:block"
              />
            );
          })}

          {/* Interactive time indicator line */}
          {(isToday || isDragging || draggedTimeX !== null) && (
            <>
              <line
                x1={activeTimeX}
                y1="0"
                x2={activeTimeX}
                y2="50"
                stroke={isDragging ? "#ef4444" : "#2563eb"}
                strokeWidth={isDragging ? "1.2" : "0.8"}
                opacity="0.8"
                className="dark:hidden"
              />
              <line
                x1={activeTimeX}
                y1="0"
                x2={activeTimeX}
                y2="50"
                stroke={isDragging ? "#ef4444" : "#10b981"}
                strokeWidth={isDragging ? "1.2" : "0.8"}
                opacity="0.8"
                className="hidden dark:block"
              />
              
              {/* Draggable handle circle */}
              {(isDragging || draggedTimeX !== null) && (
                <>
                  <circle
                    cx={activeTimeX}
                    cy="25"
                    r="2"
                    fill={isDragging ? "#ef4444" : "#2563eb"}
                    className="dark:hidden"
                  />
                  <circle
                    cx={activeTimeX}
                    cy="25"
                    r="2"
                    fill={isDragging ? "#ef4444" : "#10b981"}
                    className="hidden dark:block"
                  />
                </>
              )}
            </>
          )}
        </svg>
        
        {/* Simplified time labels for compact view */}
        <div className="relative text-[10px] text-gray-400 dark:text-emerald-500 mt-0.5">
          <span className="absolute" style={{ left: '0%', transform: 'translateX(-50%)' }}>12a</span>
          <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>6a</span>
          <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>12p</span>
          <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>6p</span>
          <span className="absolute" style={{ left: '100%', transform: 'translateX(-50%)' }}>12a</span>
        </div>

        {/* Interactive tooltip */}
        {timeAndHeight && (isDragging || draggedTimeX !== null) && (
          <div 
            className="absolute bg-black dark:bg-emerald-900 text-white dark:text-emerald-100 px-3 py-2 rounded-md text-sm font-medium shadow-lg pointer-events-none z-10 transition-all duration-150"
            style={{ 
              left: `${activeTimeX}%`, 
              transform: 'translateX(-50%)',
              top: '-45px',
              opacity: isDragging ? 1 : 0.8
            }}
            data-testid="tide-tooltip"
          >
            <div className="text-center">
              <div className="text-xs opacity-90">{timeAndHeight.time}</div>
              <div className="font-bold">{timeAndHeight.height.toFixed(1)}ft</div>
            </div>
            {/* Tooltip arrow */}
            <div 
              className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black dark:border-t-emerald-900"
            />
          </div>
        )}
      </div>
      

    </div>
  );
}