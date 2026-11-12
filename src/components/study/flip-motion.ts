import type { Transition, Variants } from 'framer-motion';

/**
 * Shared enter/exit animation for both card faces.
 * Scale never exceeds 1 so a full-width card never overflows its container on narrow screens.
 */
export const FLIP_VARIANTS: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  shown: { opacity: 1, scale: 1 },
};

export const FLIP_TRANSITION: Transition = { duration: 0.15 };

export const FLIP_MOTION_PROPS = {
  variants: FLIP_VARIANTS,
  initial: 'hidden',
  animate: 'shown',
  exit: 'hidden',
  transition: FLIP_TRANSITION,
} as const;
