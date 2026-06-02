import React from 'react';

export function Band() {
  return (
    <div className="w-[640px] h-[120px] bg-slate-900 rounded-xl relative overflow-hidden shadow-[0_0_15px_rgba(20,184,166,0.15)] border-y border-teal-500/20">
      {/* SVG Container */}
      <svg className="w-full h-full overflow-hidden absolute inset-0" viewBox="0 0 640 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(20, 184, 166, 0.4)" />
            <stop offset="100%" stopColor="rgba(20, 184, 166, 0)" />
          </linearGradient>
        </defs>
        
        {/* Tide Curve */}
        <path 
          d="M 0 65 C 33 65, 33 95, 66.6 95 C 150 95, 150 30, 233.3 30 C 320 30, 320 90, 406.6 90 C 490 90, 490 35, 573.3 35 C 606 35, 606 65, 640 65 L 640 120 L 0 120 Z" 
          fill="url(#waveGradient)" 
        />
        <path 
          d="M 0 65 C 33 65, 33 95, 66.6 95 C 150 95, 150 30, 233.3 30 C 320 30, 320 90, 406.6 90 C 490 90, 490 35, 573.3 35 C 606 35, 606 65, 640 65" 
          fill="none" 
          stroke="#14b8a6" 
          strokeWidth="3" 
          strokeLinecap="round"
        />

        {/* Current Time Indicator (e.g. 11:30 -> x=306.6, y=~60) */}
        <circle cx="306.6" cy="60" r="4" fill="#fff" className="animate-pulse" />
        <circle cx="306.6" cy="60" r="10" fill="none" stroke="#14b8a6" strokeWidth="2" opacity="0.5" />
        <line x1="306.6" y1="0" x2="306.6" y2="120" stroke="rgba(20, 184, 166, 0.3)" strokeWidth="1" strokeDasharray="2 2" />
        <text x="312" y="55" fill="#fff" fontSize="10" fontFamily="sans-serif" opacity="0.8">11:30a</text>
        
        {/* High/Low Markers Directly on Curve */}
        {/* Low 2:30am */}
        <text x="66.6" y="108" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">0.4'</text>
        <circle cx="66.6" cy="95" r="2" fill="#94a3b8" />
        
        {/* High 8:45am */}
        <text x="233.3" y="24" fill="#f8fafc" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">5.2'</text>
        <circle cx="233.3" cy="30" r="2" fill="#f8fafc" />
        
        {/* Low 3:15pm */}
        <text x="406.6" y="103" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">0.6'</text>
        <circle cx="406.6" cy="90" r="2" fill="#94a3b8" />
        
        {/* High 9:30pm */}
        <text x="573.3" y="29" fill="#f8fafc" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">4.8'</text>
        <circle cx="573.3" cy="35" r="2" fill="#f8fafc" />

        {/* Floating Time Labels at Bottom */}
        <g fill="#475569" fontSize="10" fontFamily="sans-serif" textAnchor="middle">
          <text x="20" y="115">12a</text>
          <text x="160" y="115">6a</text>
          <text x="320" y="115">12p</text>
          <text x="480" y="115">6p</text>
          <text x="620" y="115">12a</text>
        </g>
      </svg>
    </div>
  );
}