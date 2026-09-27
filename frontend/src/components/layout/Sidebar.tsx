import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, Activity, PlaySquare, FileText, Shield } from 'lucide-react';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Incidents', path: '/incidents', icon: AlertTriangle },
  { name: 'Events', path: '/events', icon: Activity },
  { name: 'Simulation', path: '/simulation', icon: PlaySquare },
  { name: 'Audit', path: '/audit', icon: FileText },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <Link
        to="/"
        className="h-16 flex items-center px-6 border-b border-slate-800 gap-3 hover:bg-slate-800/30 transition-colors"
      >
        <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-200">
          <Shield className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold tracking-wider text-slate-100 text-base leading-none">TraceX</span>
          <span className="text-[10px] text-slate-400 font-mono tracking-wide mt-1">SOC DASHBOARD</span>
        </div>
      </Link>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-slate-100 border border-slate-700/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-500 font-mono">
          <p>TraceX v1.0.0</p>
          <p className="mt-0.5">Enterprise Edition</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
