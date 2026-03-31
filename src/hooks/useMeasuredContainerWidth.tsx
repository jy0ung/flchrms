import * as React from 'react';

interface UseMeasuredContainerWidthOptions {
  initialWidth?: number;
}

interface UseMeasuredContainerWidthResult {
  width: number;
  mounted: boolean;
  containerRef: (node: HTMLDivElement | null) => void;
  measureWidth: () => void;
}

export function useMeasuredContainerWidth(
  options: UseMeasuredContainerWidthOptions = {},
): UseMeasuredContainerWidthResult {
  const { initialWidth = 0 } = options;
  const [element, setElement] = React.useState<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(initialWidth);
  const [mounted, setMounted] = React.useState(false);

  const measureWidth = React.useCallback(() => {
    if (!element) return;

    const nextWidth = Math.round(element.getBoundingClientRect().width);
    if (nextWidth <= 0) return;

    setWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
    setMounted(true);
  }, [element]);

  React.useLayoutEffect(() => {
    measureWidth();
  }, [measureWidth]);

  React.useEffect(() => {
    if (!element) return;

    let frameId: number | null = window.requestAnimationFrame(measureWidth);
    let observer: ResizeObserver | null = null;

    const scheduleMeasure = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(measureWidth);
    };

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleMeasure);
      observer.observe(element);
    }

    window.addEventListener('resize', scheduleMeasure);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      observer?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, [element, measureWidth]);

  const containerRef = React.useCallback((node: HTMLDivElement | null) => {
    setElement(node);
  }, []);

  return {
    width,
    mounted,
    containerRef,
    measureWidth,
  };
}
