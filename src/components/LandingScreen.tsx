import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IconCloud } from '@/registry/magicui/icon-cloud';
import { InteractiveHoverButton } from '@/registry/magicui/interactive-hover-button';
import traceXLogo from './Gemini_Generated_Image_p316jvp316jvp316.png';

interface LandingScreenProps {
  onEnter: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onEnter }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleEnterClick = () => {
    setIsExiting(true);
    setTimeout(() => {
      onEnter();
    }, 450); // Match exit animation duration
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1, scale: isExiting ? 0.97 : 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#000000] text-white font-mono select-none overflow-hidden"
    >
      <div className="w-full max-w-4xl flex flex-col items-center justify-center space-y-6 sm:space-y-8 my-auto">
        {/* 1. Unified TraceX Enterprise Brand Lockup */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center"
        >
          <img
            src={traceXLogo}
            alt="TraceX Logo"
            className="h-24 sm:h-32 w-auto object-contain"
          />
        </motion.div>

        {/* 2. Rotating Icon Cloud */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="w-full h-[320px] sm:h-[400px] flex items-center justify-center relative"
        >
          <IconCloud />
        </motion.div>

        {/* 3. Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-sm sm:text-base font-body text-center text-on-surface-variant max-w-xl px-4 leading-relaxed tracking-wide"
        >
          Correlate events. Detect threats. Investigate incidents.
        </motion.p>

        {/* 4. Enter SOC Dashboard Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center justify-center pt-2"
        >
          <InteractiveHoverButton
            onClick={handleEnterClick}
            className="shadow-[0_0_25px_rgba(59,130,246,0.35)] hover:shadow-[0_0_35px_rgba(59,130,246,0.65)] transition-all duration-300"
          >
            Enter SOC Dashboard
          </InteractiveHoverButton>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LandingScreen;
