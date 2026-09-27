import React, { useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  MotionValue,
} from 'framer-motion';
import {
  LayoutDashboard,
  AlertTriangle,
  Activity,
  PlaySquare,
  FileText,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { name: 'Dashboard',        path: '/',           icon: LayoutDashboard },
  { name: 'Incidents Queue',  path: '/incidents',  icon: AlertTriangle   },
  { name: 'Telemetry Events', path: '/events',     icon: Activity        },
  { name: 'Simulation Mode',  path: '/simulation', icon: PlaySquare      },
  { name: 'Audit Logs',       path: '/audit',      icon: FileText        },
];

interface DockItemProps {
  item: NavItem;
  mouseX: MotionValue<number>;
  isActive: boolean;
}

const DockItem: React.FC<DockItemProps> = ({ item, mouseX, isActive }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Compute horizontal distance from cursor (clientX) to center of element
  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Smooth spring-animated size scaling (base: 44px, magnified peak: 64px)
  const sizeSync = useTransform(distance, [-150, 0, 150], [44, 64, 44]);
  const size = useSpring(sizeSync, { mass: 0.1, stiffness: 180, damping: 14 });

  // Icon scale factor (base: 1.0, magnified peak: 1.35)
  const iconScaleSync = useTransform(distance, [-150, 0, 150], [1, 1.35, 1]);
  const iconScale = useSpring(iconScaleSync, { mass: 0.1, stiffness: 180, damping: 14 });

  const Icon = item.icon;

  return (
    <div className="relative flex flex-col items-center">
      {/* Floating Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full mb-2 px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap z-50 pointer-events-none bg-surface-container-highest/95 text-on-surface border border-outline-variant shadow-xl backdrop-blur-md flex items-center gap-1.5"
          >
            <span>{item.name}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_6px_#3B82F6]" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Dock Tile */}
      <motion.div
        ref={ref}
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center"
      >
        <NavLink
          to={item.path}
          end={item.path === '/'}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
          className={`group relative flex items-center justify-center w-full h-full rounded-xl transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container ${
            isActive
              ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/60 text-[#3B82F6] shadow-[0_0_16px_rgba(59,130,246,0.35)]'
              : 'bg-surface-container-lowest/60 border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface hover:border-[#3B82F6]/40'
          }`}
          aria-label={item.name}
        >
          <motion.div
            style={{ scale: iconScale }}
            className="flex items-center justify-center"
          >
            <Icon
              className={`w-5 h-5 transition-colors duration-200 ${
                isActive ? 'text-[#3B82F6]' : 'text-on-surface-variant group-hover:text-on-surface'
              }`}
            />
          </motion.div>

          {/* Active indicator dot */}
          {isActive && (
            <motion.span
              layoutId="activeDockIndicator"
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </NavLink>
      </motion.div>
    </div>
  );
};

export const Dock: React.FC = () => {
  const mouseX = useMotionValue(Infinity);
  const location = useLocation();

  return (
    <motion.nav
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="flex items-center justify-center gap-2.5 px-3.5 py-2 rounded-2xl bg-surface-container-high/80 backdrop-blur-xl border border-outline-variant/70 shadow-2xl shadow-black/40"
      aria-label="Main Navigation"
    >
      {navItems.map((item) => {
        const isActive =
          item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

        return (
          <DockItem
            key={item.path}
            item={item}
            mouseX={mouseX}
            isActive={isActive}
          />
        );
      })}
    </motion.nav>
  );
};

export default Dock;
