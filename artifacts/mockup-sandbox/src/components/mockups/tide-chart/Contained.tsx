import React from 'react';

export function Contained() {
  // Chart dimensions representing 24 hours
  const width = 600;
  const height = 90;
  
  // A smooth path passing through the tide points
  // 0:00 -> (0, ~45)
  // 2:30am -> (62.5, 80) - Low 0.5ft
  // 8:45am -> (218.75, 15) - High 5.2ft
  // 3:15pm -> (381.25, 75) - Low 0.8ft
  // 9:30pm -> (537.5, 20) - High 4.9ft
  // 24:00 -> (600, ~50)
  const pathData = `
    M 0 45
    S 30 80, 62.5 80
    S 140 15, 218.75 15
    S 300 75, 381.25 75
    S 460 20, 537.5 20
    S 570 50, 600 50
  `;

  const fillPath = `${pathData} L 600 90 L 0 90 Z`;
  
  // Current time representation (~11:00 AM)
  const nowX = 275; 

  return (
    <div className="flex items-center justify-center p-8 min-h-screen bg-slate-50 font-sans">
      <div className="w-[640px] rounded-3xl bg-gradient-to-br from-sky-400 to-cyan-500 shadow-xl shadow-cyan-900/10 border border-white/20 p-6 pb-5 overflow-hidden">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6 px-2">
          <div className="text-white">
            <h2 className="text-2xl font-bold tracking-tight">Today's Tide</h2>
            <p className="text-sky-50 text-sm font-medium opacity-90 mt-0.5">Pipeline, North Shore</p>
          </div>
          <div className="text-right text-white">
            <div className="text-4xl font-bold tracking-tighter">
              2.8<span className="text-xl text-sky-100 font-medium tracking-normal ml-0.5">ft</span>
            </div>
            <p className="text-sky-50 text-sm font-bold uppercase tracking-widest opacity-90 mt-1">Rising</p>
          </div>
        </div>

        {/* Chart Area */}
        <div className="relative h-[100px] w-full mt-2 select-none">
          {/* Using overflow-hidden on container ensures no bleed, avoiding overflow-visible tricks */}
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${width} ${height}`} 
            className="overflow-hidden drop-shadow-sm" 
            preserveAspectRatio="none"
          >
            {/* Defs for gradients */}
            <defs>
              <linearGradient id="tide-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Fill under curve */}
            <path d={fillPath} fill="url(#tide-gradient)" />
            
            {/* Main curve */}
            <path d={pathData} fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Now line (vertical dashed) */}
            <line x1={nowX} y1="0" x2={nowX} y2={height} stroke="white" strokeWidth="2" strokeDasharray="4 4" opacity="0.4" />
            
            {/* High/Low Point Markers */}
            <circle cx="62.5" cy="80" r="5" fill="white" className="drop-shadow-md" />
            <circle cx="218.75" cy="15" r="5" fill="white" className="drop-shadow-md" />
            <circle cx="381.25" cy="75" r="5" fill="white" className="drop-shadow-md" />
            <circle cx="537.5" cy="20" r="5" fill="white" className="drop-shadow-md" />

            {/* Now indicator dot */}
            <circle cx={nowX} cy="42" r="6" fill="#0ea5e9" stroke="white" strokeWidth="3" className="drop-shadow-md" />
          </svg>

          {/* Tide Labels positioned absolutely within chart bounds */}
          <div className="absolute top-[86px] left-[62.5px] -translate-x-1/2 text-[11px] font-bold text-white drop-shadow-md">0.5ft</div>
          <div className="absolute top-[-3px] left-[218.75px] -translate-x-1/2 text-[11px] font-bold text-white drop-shadow-md">5.2ft</div>
          <div className="absolute top-[81px] left-[381.25px] -translate-x-1/2 text-[11px] font-bold text-white drop-shadow-md">0.8ft</div>
          <div className="absolute top-[2px] left-[537.5px] -translate-x-1/2 text-[11px] font-bold text-white drop-shadow-md">4.9ft</div>
          
          <div className="absolute top-[-4px] left-[285px] text-[10px] font-bold text-sky-600 bg-white px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider">Now</div>
        </div>

        {/* Time Labels Container */}
        <div className="flex justify-between mt-5 text-sm font-bold text-white/80 px-1 uppercase tracking-wider">
          <span>12a</span>
          <span>6a</span>
          <span>12p</span>
          <span>6p</span>
          <span>12a</span>
        </div>
      </div>
    </div>
  );
}
