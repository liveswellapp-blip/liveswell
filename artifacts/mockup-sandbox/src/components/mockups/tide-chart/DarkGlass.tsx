import React from 'react';

export function DarkGlass() {
  return (
    <div className="w-[640px] h-[170px] bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl rounded-xl overflow-hidden flex flex-col relative border border-white/5 shadow-2xl font-sans">
      {/* Chart Area */}
      <div className="flex-1 relative">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 640 140" preserveAspectRatio="none">
          <defs>
            <linearGradient id="emeraldGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Fill */}
          <path 
            d="M 0 50 C 30 50, 40 110, 67 110 C 130 110, 160 20, 233 20 C 300 20, 330 105, 407 105 C 470 105, 500 25, 573 25 C 610 25, 620 80, 640 80 L 640 140 L 0 140 Z" 
            fill="url(#emeraldGlow)" 
          />
          
          {/* Line */}
          <path 
            d="M 0 50 C 30 50, 40 110, 67 110 C 130 110, 160 20, 233 20 C 300 20, 330 105, 407 105 C 470 105, 500 25, 573 25 C 610 25, 620 80, 640 80" 
            fill="none" 
            stroke="#10b981" 
            strokeWidth="3" 
            strokeLinecap="round"
          />

          {/* Now Line */}
          <line x1="266" y1="0" x2="266" y2="140" stroke="white" strokeWidth="1.5" strokeDasharray="4 4" className="opacity-80" />
          
        </svg>

        {/* High/Low Markers */}
        <div className="absolute flex flex-col items-center" style={{ left: '67px', top: '110px', transform: 'translate(-50%, -50%)' }}>
          <div className="w-2 h-2 rounded-full bg-slate-900 border-2 border-[#10b981]"></div>
          <div className="mt-1 px-1.5 py-0.5 rounded-md bg-slate-900/80 border border-white/10 text-[9px] font-medium text-white shadow-sm backdrop-blur-sm">
            0.4ft
          </div>
        </div>
        
        <div className="absolute flex flex-col items-center" style={{ left: '233px', top: '20px', transform: 'translate(-50%, -50%)' }}>
          <div className="mb-1 px-1.5 py-0.5 rounded-md bg-slate-900/80 border border-white/10 text-[9px] font-medium text-white shadow-sm backdrop-blur-sm">
            5.2ft
          </div>
          <div className="w-2 h-2 rounded-full bg-slate-900 border-2 border-[#10b981]"></div>
        </div>

        <div className="absolute flex flex-col items-center" style={{ left: '407px', top: '105px', transform: 'translate(-50%, -50%)' }}>
          <div className="w-2 h-2 rounded-full bg-slate-900 border-2 border-[#10b981]"></div>
          <div className="mt-1 px-1.5 py-0.5 rounded-md bg-slate-900/80 border border-white/10 text-[9px] font-medium text-white shadow-sm backdrop-blur-sm">
            0.6ft
          </div>
        </div>

        <div className="absolute flex flex-col items-center" style={{ left: '573px', top: '25px', transform: 'translate(-50%, -50%)' }}>
          <div className="mb-1 px-1.5 py-0.5 rounded-md bg-slate-900/80 border border-white/10 text-[9px] font-medium text-white shadow-sm backdrop-blur-sm">
            4.8ft
          </div>
          <div className="w-2 h-2 rounded-full bg-slate-900 border-2 border-[#10b981]"></div>
        </div>
        
        {/* Now Label */}
        <div className="absolute" style={{ left: '272px', top: '8px' }}>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-slate-900/50 px-1.5 py-0.5 rounded">Now</span>
        </div>
      </div>

      {/* Axis Area */}
      <div className="h-[30px] border-t border-white/10 flex items-center justify-between px-4 bg-slate-950/40">
        <span className="text-[11px] font-medium text-slate-400">12a</span>
        <span className="text-[11px] font-medium text-slate-400">6a</span>
        <span className="text-[11px] font-medium text-slate-400">12p</span>
        <span className="text-[11px] font-medium text-slate-400">6p</span>
        <span className="text-[11px] font-medium text-slate-400">12a</span>
      </div>
    </div>
  );
}
