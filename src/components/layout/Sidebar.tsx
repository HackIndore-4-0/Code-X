import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Activity,
  PlaySquare,
  FileText,
  Shield,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard',        path: '/',           icon: LayoutDashboard },
  { name: 'Incidents Queue',  path: '/incidents',  icon: AlertTriangle   },
  { name: 'Telemetry Events', path: '/events',     icon: Activity        },
  { name: 'Simulation Mode',  path: '/simulation', icon: PlaySquare      },
  { name: 'Audit Logs',       path: '/audit',      icon: FileText        },
];

export const Sidebar: React.FC = () => {
  return (
    <aside
      className="w-56 flex flex-col h-screen sticky top-0 shrink-0 font-code-sm bg-surface-container-lowest border-r border-outline-variant"
    >
      {/* ── Brand Header ── */}
      <Link
        to="/"
        className="h-14 flex items-center px-4 gap-3 border-b border-outline-variant"
      >
        <div className="p-1.5 rounded-md flex items-center justify-center bg-surface-container-high border border-outline-variant">
          <Shield className="w-4 h-4 text-primary" />
        </div>

        <div className="flex flex-col">
          <span className="font-headline-sm text-primary tracking-wider leading-none">
            TraceX
          </span>
          <span className="font-label-sm text-on-surface-variant mt-1">
            SOC DASHBOARD
          </span>
        </div>
      </Link>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2.5 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md font-body-sm transition-colors ${
                  isActive
                    ? 'bg-surface-container-high border border-outline text-primary font-semibold'
                    : 'text-on-surface-variant border border-transparent hover:bg-surface-container-low hover:text-on-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                  />
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="ml-auto w-1 h-3 rounded-sm bg-primary" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Footer Status ── */}
      <div className="p-3 font-code-sm border-t border-outline-variant text-on-surface-variant space-y-1">
        <div className="flex justify-between items-center">
          <span>Engine Status:</span>
          <span className="flex items-center gap-1.5 font-semibold text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            ONLINE
          </span>
        </div>
        <div className="text-[10px] text-on-surface-variant opacity-75">
          FastAPI backend @ :8000
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
