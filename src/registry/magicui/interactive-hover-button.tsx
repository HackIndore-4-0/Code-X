import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
}

export const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ children = 'Enter SOC Dashboard', className = '', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={`group relative w-auto cursor-pointer overflow-hidden rounded-full border border-primary/50 bg-surface-container-low px-8 py-3.5 text-center font-mono font-semibold transition-all duration-300 hover:border-primary hover:shadow-[0_0_24px_rgba(59,130,246,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${className}`}
      {...props}
    >
      <div className="flex items-center justify-center">
        <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0 text-on-surface tracking-wide">
          {children}
        </span>
      </div>
      <div className="absolute inset-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2.5 text-white opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-hover:bg-[#3B82F6] font-bold tracking-wide rounded-full">
        <span>{children}</span>
        <ArrowRight className="w-4 h-4 text-white" />
      </div>
    </button>
  );
});

InteractiveHoverButton.displayName = 'InteractiveHoverButton';

export default InteractiveHoverButton;
