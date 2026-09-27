import React, { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

export interface NumberTickerProps extends React.ComponentPropsWithoutRef<'span'> {
  value: number;
  direction?: 'up' | 'down';
  delay?: number; // in seconds
  decimalPlaces?: number;
  format?: (val: number) => string;
  startValue?: number;
}

export function NumberTicker({
  value,
  direction = 'up',
  delay = 0,
  decimalPlaces = 0,
  format,
  startValue,
  className = '',
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);

  const initialValue =
    startValue !== undefined
      ? startValue
      : direction === 'down'
      ? value
      : 0;

  const motionValue = useMotionValue(initialValue);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
  });

  const isInView = useInView(ref, { once: true, margin: '0px' });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      if (ref.current) {
        ref.current.textContent = format
          ? format(value)
          : Intl.NumberFormat('en-US', {
              minimumFractionDigits: decimalPlaces,
              maximumFractionDigits: decimalPlaces,
            }).format(value);
      }
      return;
    }

    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(value);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, delay, value, motionValue, shouldReduceMotion, decimalPlaces, format]);

  useEffect(() => {
    if (shouldReduceMotion) return;

    return springValue.on('change', (latest) => {
      if (ref.current) {
        const rounded = Number(latest.toFixed(decimalPlaces));
        const formatted = format
          ? format(rounded)
          : Intl.NumberFormat('en-US', {
              minimumFractionDigits: decimalPlaces,
              maximumFractionDigits: decimalPlaces,
            }).format(rounded);
        ref.current.textContent = formatted;
      }
    });
  }, [springValue, decimalPlaces, format, shouldReduceMotion]);

  const initialFormatted = format
    ? format(shouldReduceMotion ? value : initialValue)
    : Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(shouldReduceMotion ? value : initialValue);

  return (
    <span
      ref={ref}
      className={`inline-block tabular-nums tracking-wider ${className}`}
      {...props}
    >
      {initialFormatted}
    </span>
  );
}

export default NumberTicker;
