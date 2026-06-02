import { TidePoint, Location } from "@/types/weather";
import { useState, useRef } from "react";

interface TideChartProps {
  tides: TidePoint[];
  date: string;
  location?: Location;
  sunrise?: string;
  sunset?: string;
}

export default function TideChart({ tides, date, location, sunrise, sunset }: TideChartProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTimeX, setDraggedTimeX] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const parseTimeToHours = (timeStr: string) => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const isPM = match[3].toUpperCase() === "PM";
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return hours + minutes / 60;
  };

  const generateTideData = () => {
    const resolution = 144;
    const timeStep = 24 / resolution;
    const times = Array.from({ length: resolution }, (_, i) => i * timeStep);

    const tidePoints = tides
      .map((tide) => ({ hour: parseTimeToHours(tide.time), height: tide.height, type: tide.type }))
      .sort((a, b) => a.hour - b.hour);

    const getHeightAtTime = (time: number) => {
      const exactMatch = tidePoints.find((t) => Math.abs(t.hour - time) < 0.01);
      if (exactMatch) return exactMatch.height;

      let beforeTide = tidePoints[tidePoints.length - 1];
      let afterTide = tidePoints[0];
      for (let i = 0; i < tidePoints.length; i++) {
        if (tidePoints[i].hour <= time) beforeTide = tidePoints[i];
        if (tidePoints[i].hour > time) { afterTide = tidePoints[i]; break; }
      }

      let interpolationFactor: number;
      if (beforeTide.hour > afterTide.hour) {
        const totalTime = (24 - beforeTide.hour) + afterTide.hour;
        const currentTime = time >= beforeTide.hour ? time - beforeTide.hour : 24 - beforeTide.hour + time;
        interpolationFactor = currentTime / totalTime;
      } else {
        const timeDiff = afterTide.hour - beforeTide.hour;
        interpolationFactor = timeDiff > 0 ? (time - beforeTide.hour) / timeDiff : 0;
      }

      const t = Math.max(0, Math.min(1, interpolationFactor));
      const cosineT = (1 - Math.cos(t * Math.PI)) / 2;
      return beforeTide.height + (afterTide.height - beforeTide.height) * cosineT;
    };

    return times.map((time) => ({
      hour: time,
      height: getHeightAtTime(time),
      time: `${Math.floor(time).toString().padStart(2, "0")}:${Math.floor((time % 1) * 60).toString().padStart(2, "0")}`,
    }));
  };

  const hourlyData = generateTideData();
  const maxHeight = Math.max(...hourlyData.map((d) => d.height));
  const minHeight = Math.min(...hourlyData.map((d) => d.height));
  const heightRange = maxHeight - minHeight;

  // SVG viewBox dimensions
  const VW = 640;
  const VH = 120;
  // Padding reserves space for badges above high-tide dots and below low-tide dots
  const TOP_PAD = 20;
  const BOT_PAD = 26;

  const tideY = (normalized: number) =>
    TOP_PAD + (1 - normalized) * (VH - TOP_PAD - BOT_PAD);

  const createTidePath = () => {
    const points = hourlyData.map((point, index) => {
      const x = (index / (hourlyData.length - 1)) * VW;
      const normalized = heightRange > 0 ? (point.height - minHeight) / heightRange : 0.5;
      return `${x},${tideY(normalized)}`;
    });
    return `M ${points.join(" L ")}`;
  };

  const majorTides = tides.map((tide) => {
    const hour = parseTimeToHours(tide.time);
    const closest = hourlyData.reduce((acc, p) =>
      Math.abs(p.hour - hour) < Math.abs(acc.hour - hour) ? p : acc
    );
    const idx = hourlyData.indexOf(closest);
    const x = (idx / (hourlyData.length - 1)) * VW;
    const normalized = heightRange > 0 ? (closest.height - minHeight) / heightRange : 0.5;
    const y = tideY(normalized);
    return { ...tide, svgX: x, svgY: y, height: closest.height };
  });

  const getCurrentTimePosition = () => {
    const getTimezone = (lat: number, lon: number) => {
      if (lon >= -125 && lon <= -114 && lat >= 32 && lat <= 49) return "America/Los_Angeles";
      if (lon >= -115 && lon <= -102 && lat >= 31 && lat <= 49) return "America/Denver";
      if (lon >= -104 && lon <= -87 && lat >= 25 && lat <= 49) return "America/Chicago";
      if (lon >= -88 && lon <= -66 && lat >= 25 && lat <= 47) return "America/New_York";
      return "UTC";
    };
    const now = new Date();
    if (location) {
      const tz = getTimezone(parseFloat(location.latitude), parseFloat(location.longitude));
      const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
      return ((local.getHours() + local.getMinutes() / 60) / 24) * VW;
    }
    return ((now.getHours() + now.getMinutes() / 60) / 24) * VW;
  };

  const currentTimeX = getCurrentTimePosition();
  const isToday = date === "today" || date === "Today";

  const screenToChartX = (clientX: number) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(VW, ((clientX - rect.left) / rect.width) * VW));
  };

  const getInfoAtX = (svgX: number) => {
    const hourOfDay = (svgX / VW) * 24;
    const closest = hourlyData.reduce((acc, p) =>
      Math.abs(p.hour - hourOfDay) < Math.abs(acc.hour - hourOfDay) ? p : acc
    );
    const h = Math.floor(hourOfDay);
    const m = Math.floor((hourOfDay % 1) * 60);
    const period = h >= 12 ? "PM" : "AM";
    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { time: `${dh}:${m.toString().padStart(2, "0")} ${period}`, height: closest.height };
  };

  const handleStart = (e: React.TouchEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setDraggedTimeX(screenToChartX(clientX));
  };
  const handleMove = (e: React.TouchEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setDraggedTimeX(screenToChartX(clientX));
  };
  const handleEnd = () => {
    setIsDragging(false);
    setTimeout(() => setDraggedTimeX(null), 2000);
  };

  const activeX = isDragging ? (draggedTimeX ?? currentTimeX) : (draggedTimeX !== null ? draggedTimeX : currentTimeX);
  const dragInfo = (isDragging || draggedTimeX !== null) && draggedTimeX !== null ? getInfoAtX(draggedTimeX) : null;

  const tidePath = createTidePath();

  return (
    <div className="w-full rounded-xl overflow-hidden flex flex-col bg-gradient-to-br from-slate-900/95 to-slate-950/95 border border-white/5 shadow-xl">
      {/* Chart area */}
      <div className="relative" style={{ height: "120px" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="absolute inset-0 w-full h-full cursor-pointer"
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
            <linearGradient id={`emeraldGlow-${date}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Gradient fill under curve */}
          <path
            d={`${tidePath} L ${VW},${VH} L 0,${VH} Z`}
            fill={`url(#emeraldGlow-${date})`}
            stroke="none"
          />

          {/* Curve line */}
          <path
            d={tidePath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* High/low tide vertical tick lines */}
          {majorTides.map((tide, i) => (
            <line
              key={`tick-${i}`}
              x1={tide.svgX}
              y1={tide.svgY}
              x2={tide.svgX}
              y2={VH}
              stroke="#10b981"
              strokeWidth="0.5"
              opacity="0.4"
            />
          ))}

          {/* Day/night shading + sunrise/sunset lines */}
          {sunrise && sunset && (() => {
            const srX = (parseTimeToHours(sunrise) / 24) * VW;
            const ssX = (parseTimeToHours(sunset) / 24) * VW;
            return (
              <g>
                {/* Night before sunrise */}
                <rect x="0" y="0" width={srX} height={VH} fill="black" opacity="0.25" />
                {/* Night after sunset */}
                <rect x={ssX} y="0" width={VW - ssX} height={VH} fill="black" opacity="0.25" />
                {/* Sunrise line */}
                <line x1={srX} y1="0" x2={srX} y2={VH} stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 5" opacity="0.4" />
                {/* Sunset line */}
                <line x1={ssX} y1="0" x2={ssX} y2={VH} stroke="#fb923c" strokeWidth="1" strokeDasharray="3 5" opacity="0.4" />
              </g>
            );
          })()}

          {/* Now / drag indicator */}
          {(isToday || isDragging || draggedTimeX !== null) && (
            <line
              x1={activeX}
              y1="0"
              x2={activeX}
              y2={VH}
              stroke={isDragging ? "#f87171" : "white"}
              strokeWidth={isDragging ? "1.5" : "1"}
              strokeDasharray="4 4"
              opacity="0.75"
            />
          )}
        </svg>

        {/* High/Low tide markers */}
        {majorTides.map((tide, i) => {
          const pct = (tide.svgX / VW) * 100;
          const yPct = (tide.svgY / VH) * 100;
          const isHigh = tide.type === "high";
          return (
            <div
              key={`marker-${i}`}
              className="absolute flex flex-col items-center pointer-events-none"
              style={{
                left: `${pct}%`,
                top: `${yPct}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {isHigh && (
                <div className="mb-0.5 px-1 py-px rounded bg-slate-900/80 border border-white/10 text-[8px] font-semibold text-emerald-300 shadow leading-tight whitespace-nowrap">
                  {tide.time}
                </div>
              )}
              <div className="w-1.5 h-1.5 rounded-full bg-slate-950 border border-emerald-400" />
              {!isHigh && (
                <div className="mt-0.5 px-1 py-px rounded bg-slate-900/80 border border-white/10 text-[8px] font-semibold text-slate-300 shadow leading-tight whitespace-nowrap">
                  {tide.time}
                </div>
              )}
            </div>
          );
        })}


        {/* Drag tooltip */}
        {dragInfo && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: `${(activeX / VW) * 100}%`,
              top: "4px",
              transform: "translateX(-50%)",
            }}
          >
            <div className="bg-slate-800 border border-white/20 text-white px-2 py-1 rounded-lg shadow-xl text-center">
              <div className="text-[9px] text-slate-400">{dragInfo.time}</div>
              <div className="text-[11px] font-bold text-emerald-400">{dragInfo.height.toFixed(1)}ft</div>
            </div>
          </div>
        )}
      </div>

      {/* Time axis strip */}
      <div className="relative flex items-center justify-between px-3 border-t border-white/10 bg-slate-950/40" style={{ height: "26px" }}>
        {/* Now tick in axis — just a small emerald dot, no text */}
        {isToday && !dragInfo && (
          <div
            className="absolute top-0 bottom-0 flex items-center pointer-events-none"
            style={{ left: `${(currentTimeX / VW) * 100}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
          </div>
        )}
        {["12a", "6a", "12p", "6p", "12a"].map((label, i) => (
          <span key={i} className="text-[10px] font-medium text-slate-400">{label}</span>
        ))}
      </div>
    </div>
  );
}
