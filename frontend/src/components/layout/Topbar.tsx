import React from 'react';
import { Search, Bell, User } from 'lucide-react';

const Topbar: React.FC = () => {
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
      {/* Search Bar */}
      <div className="relative w-80">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search entities, events, hashes, or IPs..."
          className="w-full pl-8 pr-3 py-1 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-colors font-mono"
        />
      </div>

      {/* Right Actions & Status Indicator */}
      <div className="flex items-center gap-3">
        {/* LIVE Status Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono font-semibold">
          <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          <span className="text-emerald-400 tracking-wider">LIVE</span>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
          <button className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer">
            <Bell className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2 pl-2">
            <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="hidden md:flex flex-col text-[11px] leading-tight">
              <span className="text-slate-200 font-medium">SOC Analyst</span>
              <span className="text-slate-500 font-mono text-[10px]">Level 2</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
