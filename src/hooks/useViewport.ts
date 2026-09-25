import { useEffect, useState } from 'react';

export interface Viewport {
  width: number;
  height: number;
  isMobile: boolean;
  isPortrait: boolean;
}

const MOBILE_BREAKPOINT = 900;

const read = (): Viewport => {
  const width = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const height = typeof window === 'undefined' ? 900 : window.innerHeight;
  return {
    width,
    height,
    isMobile: width <= MOBILE_BREAKPOINT,
    isPortrait: height >= width,
  };
};

// Rotating a phone fires resize before the new dimensions settle on some
// Android browsers, so orientationchange gets a second read on the next frame.
export const useViewport = (): Viewport => {
  const [viewport, setViewport] = useState<Viewport>(read);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewport(read()));
    };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return viewport;
};
