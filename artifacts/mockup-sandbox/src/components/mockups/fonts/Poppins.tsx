export default function Poppins() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
        .font-preview * { font-family: 'Poppins', sans-serif !important; }
      `}</style>
      <div className="font-preview flex items-center justify-center min-h-screen bg-[#030a14]">
        <div className="w-[390px] h-[780px] bg-[#030a14] overflow-hidden relative flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-8 pb-4">
            <img src="/logo.png" alt="LiveSwell" className="h-8 object-contain" />
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 text-sm font-semibold">JB</span>
            </div>
          </div>

          {/* Location Bar */}
          <div className="mx-5 mb-4 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
            <span className="text-lg">📍</span>
            <span className="text-white/80 text-sm font-medium">Jacksonville Beach, FL</span>
            <span className="ml-auto text-white/40 text-xs font-medium">Change</span>
          </div>

          {/* Hero Conditions Card */}
          <div className="mx-5 mb-4 rounded-2xl overflow-hidden" style={{background:'linear-gradient(135deg,#0d3d2e 0%,#041a2e 100%)', border:'1px solid rgba(52,211,153,0.2)'}}>
            <div className="px-5 pt-4 pb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400" style={{boxShadow:'0 0 6px #34d399'}} />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">LIVE CONDITIONS</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-5xl font-black text-white leading-none">4–6<span className="text-2xl font-bold text-white/60 ml-1">ft</span></div>
                  <div className="text-emerald-400 font-semibold text-sm mt-1">Good • Offshore winds</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">78°</div>
                  <div className="text-white/50 text-xs font-medium">Water 72°</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 border-t border-white/10">
              {[['💨','12 mph','Wind'],['🌊','8 sec','Period'],['🧭','SW','Direction']].map(([icon,val,label])=>(
                <div key={label} className="py-3 flex flex-col items-center border-r last:border-r-0 border-white/10">
                  <span className="text-base mb-0.5">{icon}</span>
                  <span className="text-white font-semibold text-sm">{val}</span>
                  <span className="text-white/40 text-[10px] font-medium uppercase tracking-wide">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Surf Quality */}
          <div className="mx-5 mb-4 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-1">SURF QUALITY</div>
              <div className="text-white font-semibold text-base">Pretty Solid Today</div>
              <div className="text-white/50 text-xs font-medium mt-0.5">Best window 6am – 10am</div>
            </div>
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{background:'conic-gradient(#34d399 0% 72%, rgba(255,255,255,0.08) 72%)'}}>
              <div className="w-10 h-10 rounded-full bg-[#030a14] flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-lg">7.2</span>
              </div>
            </div>
          </div>

          {/* Forecast Strip */}
          <div className="mx-5 mb-4">
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              5-DAY FORECAST
            </div>
            <div className="flex gap-2">
              {[['Today','4–6','★'],['Thu','3–5',''],['Fri','5–7','★'],['Sat','2–4',''],['Sun','4–6','']].map(([day,waves,star])=>(
                <div key={day} className={`flex-1 py-2.5 rounded-xl flex flex-col items-center border ${day==='Today'?'bg-emerald-500/15 border-emerald-500/30':'bg-white/[0.03] border-white/[0.06]'}`}>
                  <span className={`text-[10px] font-medium uppercase ${day==='Today'?'text-emerald-400':'text-white/40'}`}>{day}</span>
                  <span className="text-white font-semibold text-xs mt-1">{waves}</span>
                  {star && <span className="text-amber-400 text-[10px]">★</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Font Label */}
          <div className="mx-5 mt-auto mb-6 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-emerald-400 font-semibold text-sm tracking-wide">Poppins</span>
            <span className="text-white/40 text-xs font-medium ml-2">— geometric & modern</span>
          </div>

          {/* Bottom Nav */}
          <div className="absolute bottom-0 left-0 right-0 flex border-t border-white/10 bg-[rgba(3,10,20,0.95)]">
            {[['🏄','Spots',true],['👤','Profile',false]].map(([icon,label,active])=>(
              <div key={label} className="flex-1 py-3 flex flex-col items-center gap-0.5">
                <span className="text-lg">{icon}</span>
                <span className={`text-[10px] font-medium ${active?'text-emerald-400':'text-white/40'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
