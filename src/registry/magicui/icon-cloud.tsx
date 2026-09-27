import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  Shield,
  Lock,
  Fingerprint,
  Network,
  Bug,
  Server,
  Terminal,
  Database,
  Key,
  Cpu,
  Flame,
  AlertTriangle,
  GitFork,
} from 'lucide-react';

export interface IconCloudItem {
  id: string;
  name: string;
  imageUrl?: string;
  icon?: React.ElementType;
  color?: string;
}

export interface IconCloudProps {
  images?: string[];
  items?: IconCloudItem[];
  className?: string;
}

// Curated list of technology and cybersecurity icons for TraceX
const TECH_ICONS: IconCloudItem[] = [
  { id: 'react', name: 'React', imageUrl: 'https://cdn.simpleicons.org/react' },
  { id: 'typescript', name: 'TypeScript', imageUrl: 'https://cdn.simpleicons.org/typescript' },
  { id: 'vite', name: 'Vite', imageUrl: 'https://cdn.simpleicons.org/vite' },
  { id: 'python', name: 'Python', imageUrl: 'https://cdn.simpleicons.org/python' },
  { id: 'fastapi', name: 'FastAPI', imageUrl: 'https://cdn.simpleicons.org/fastapi/009688' },
  { id: 'postgresql', name: 'PostgreSQL', imageUrl: 'https://cdn.simpleicons.org/postgresql/4169E1' },
  { id: 'docker', name: 'Docker', imageUrl: 'https://cdn.simpleicons.org/docker/2496ED' },
  { id: 'github', name: 'GitHub', imageUrl: 'https://cdn.simpleicons.org/github/ffffff' },
  { id: 'tailwindcss', name: 'Tailwind CSS', imageUrl: 'https://cdn.simpleicons.org/tailwindcss/06B6D4' },
];

const SECURITY_ICONS: IconCloudItem[] = [
  { id: 'shield', name: 'Shield', icon: Shield, color: '#3B82F6' },
  { id: 'lock', name: 'Lock', icon: Lock, color: '#10B981' },
  { id: 'fingerprint', name: 'Fingerprint', icon: Fingerprint, color: '#8B5CF6' },
  { id: 'network', name: 'Network', icon: Network, color: '#06B6D4' },
  { id: 'bug', name: 'Bug', icon: Bug, color: '#EF4444' },
  { id: 'server', name: 'Server', icon: Server, color: '#F59E0B' },
  { id: 'terminal', name: 'Terminal', icon: Terminal, color: '#34D399' },
  { id: 'database', name: 'Database', icon: Database, color: '#60A5FA' },
  { id: 'key', name: 'Security Key', icon: Key, color: '#FBBF24' },
  { id: 'cpu', name: 'AI Engine', icon: Cpu, color: '#A78BFA' },
  { id: 'flame', name: 'Threat Score', icon: Flame, color: '#F97316' },
  { id: 'alert', name: 'Anomaly Detector', icon: AlertTriangle, color: '#EAB308' },
  { id: 'gitfork', name: 'Event Graph', icon: GitFork, color: '#EC4899' },
];

interface Point3D {
  x: number;
  y: number;
  z: number;
  id: string;
}

export function IconCloud({ images, items: customItems, className = '' }: IconCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Combine technology & cybersecurity icons for optimal visual distribution
  const cloudItems: IconCloudItem[] = useMemo(() => {
    if (customItems && customItems.length > 0) return customItems;

    if (images && images.length > 0) {
      return images.map((img, idx) => ({
        id: `img-${idx}`,
        name: `Icon ${idx + 1}`,
        imageUrl: img,
      }));
    }

    // Interleave tech & security icons to form a balanced mixture
    const combined: IconCloudItem[] = [];
    const maxLen = Math.max(TECH_ICONS.length, SECURITY_ICONS.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < TECH_ICONS.length) combined.push(TECH_ICONS[i]);
      if (i < SECURITY_ICONS.length) combined.push(SECURITY_ICONS[i]);
    }
    return combined;
  }, [images, customItems]);

  // Compute 3D Fibonacci sphere points
  const points = useMemo(() => {
    const pts: Point3D[] = [];
    const n = cloudItems.length;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < n; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
      pts.push({
        x: Math.cos(theta) * Math.sin(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(phi),
        id: cloudItems[i].id,
      });
    }
    return pts;
  }, [cloudItems]);

  // Rotation angles & continuous speed
  const rotRef = useRef({ rx: 0.003, ry: 0.005, angleX: 0, angleY: 0 });
  const [rotatedPoints, setRotatedPoints] = useState<
    Array<{ id: string; px: number; py: number; scale: number; opacity: number; zIndex: number }>
  >([]);

  // Mouse interaction handling
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const mouseX = e.clientX - cx;
    const mouseY = e.clientY - cy;

    rotRef.current.ry = (mouseX / (rect.width / 2)) * 0.012;
    rotRef.current.rx = (-mouseY / (rect.height / 2)) * 0.012;
  };

  const handleMouseLeave = () => {
    rotRef.current.rx = 0.003;
    rotRef.current.ry = 0.005;
  };

  // Continuous 3D animation loop
  useEffect(() => {
    let animId: number;

    const animate = () => {
      if (!shouldReduceMotion) {
        rotRef.current.angleX += rotRef.current.rx;
        rotRef.current.angleY += rotRef.current.ry;
      }

      const { angleX, angleY } = rotRef.current;
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const updated = points.map((pt) => {
        // Rotate around X axis
        const y1 = pt.y * cosX - pt.z * sinX;
        const z1 = pt.y * sinX + pt.z * cosX;

        // Rotate around Y axis
        const x2 = pt.x * cosY + z1 * sinY;
        const z2 = -pt.x * sinY + z1 * cosY;

        // Compact spherical projection
        const radiusPct = 36; // Compact spherical radius percentage
        const px = 50 + x2 * radiusPct;
        const py = 50 + y1 * radiusPct;
        
        // Depth scaling: front icons larger & brighter, back icons smaller & dimmer
        const scale = 0.65 + ((z2 + 1) / 2) * 0.55; // Range: 0.65 to 1.2
        const opacity = Math.max(0.3, Math.min(1.0, (z2 + 1.3) / 2.3));
        const zIndex = Math.round((z2 + 1) * 100);

        return {
          id: pt.id,
          px,
          py,
          scale,
          opacity,
          zIndex,
        };
      });

      setRotatedPoints(updated);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animId);
  }, [points, shouldReduceMotion]);

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-full max-w-[440px] max-h-[440px] mx-auto flex items-center justify-center select-none overflow-hidden ${className}`}
    >
      {rotatedPoints.map((rpt, idx) => {
        const item = cloudItems[idx];
        if (!item) return null;

        const IconComp = item.icon || Shield;
        const isFailed = failedImages[item.id];
        const showImage = item.imageUrl && !isFailed;

        return (
          <div
            key={rpt.id}
            className="absolute flex items-center justify-center pointer-events-auto cursor-pointer group transition-transform duration-75"
            style={{
              left: `${rpt.px}%`,
              top: `${rpt.py}%`,
              transform: `translate(-50%, -50%) scale(${rpt.scale})`,
              opacity: rpt.opacity,
              zIndex: rpt.zIndex,
            }}
            title={item.name}
          >
            {/* Frameless colorful icon container matching Magic UI official demo */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center p-1.5 transition-transform duration-200 group-hover:scale-125">
              {showImage ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                  onError={() => handleImageError(item.id)}
                  loading="lazy"
                />
              ) : (
                <IconComp
                  className="w-full h-full filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-colors duration-200"
                  style={{ color: item.color || '#3B82F6' }}
                />
              )}
            </div>

            {/* Subtle name badge on hover */}
            <span className="absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-black/90 text-white border border-white/20 shadow-xl pointer-events-none whitespace-nowrap z-50">
              {item.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default IconCloud;
