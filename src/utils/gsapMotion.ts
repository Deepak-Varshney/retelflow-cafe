import { gsap } from 'gsap';

/**
 * GSAP Motion Utilities for Liquid Glass
 * Provides ultra-smooth physics-based micro-interactions, spring tweens,
 * and entrance transitions for cards, modals, and navigation elements.
 */

/** Smooth spring bounce on press */
export const gsapPressIn = (target: any) => {
  if (!target) return;
  try {
    gsap.to(target, {
      scale: 0.94,
      duration: 0.18,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  } catch {}
};

export const gsapPressOut = (target: any) => {
  if (!target) return;
  try {
    gsap.to(target, {
      scale: 1,
      duration: 0.35,
      ease: 'back.out(2)',
      overwrite: 'auto',
    });
  } catch {}
};

/** Smooth staggered liquid glass card entrance */
export const gsapStaggerIn = (targets: any[], onComplete?: () => void) => {
  if (!targets || targets.length === 0) return;
  try {
    gsap.fromTo(
      targets,
      { opacity: 0, y: 16, scale: 0.96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.42,
        stagger: 0.05,
        ease: 'power3.out',
        onComplete,
        overwrite: 'auto',
      }
    );
  } catch {}
};

/** Liquid glass modal backdrop fade and slide */
export const gsapModalSlideIn = (sheetTarget: any, backdropTarget?: any) => {
  try {
    if (backdropTarget) {
      gsap.fromTo(
        backdropTarget,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' }
      );
    }
    if (sheetTarget) {
      gsap.fromTo(
        sheetTarget,
        { y: 80, opacity: 0.8 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out', overwrite: 'auto' }
      );
    }
  } catch {}
};

export default {
  gsapPressIn,
  gsapPressOut,
  gsapStaggerIn,
  gsapModalSlideIn,
};
