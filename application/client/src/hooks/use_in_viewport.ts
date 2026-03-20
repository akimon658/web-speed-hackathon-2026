import { useCallback, useRef, useState } from "react";

export function useInViewport(rootMargin = "200px"): {
  ref: (el: HTMLElement | null) => void;
  isInViewport: boolean;
} {
  const [isInViewport, setIsInViewport] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (el: HTMLElement | null) => {
      observerRef.current?.disconnect();

      if (el === null) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setIsInViewport(true);
            observer.disconnect();
          }
        },
        { rootMargin },
      );

      observer.observe(el);
      observerRef.current = observer;
    },
    [rootMargin],
  );

  return { ref, isInViewport };
}
