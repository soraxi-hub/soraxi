"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseIntersectionObserverProps {
  onIntersectAction: () => void;
  enabled?: boolean;
  threshold?: number;
  rootMargin?: string;
}

export function useIntersectionObserver({
  onIntersectAction,
  enabled = true,
  threshold = 0.1,
  rootMargin = "0px",
}: UseIntersectionObserverProps) {
  const targetRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && enabled) {
        onIntersectAction();
      }
    },
    [onIntersectAction, enabled]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    if (targetRef.current) {
      observer.observe(targetRef.current);
    }

    return () => {
      if (targetRef.current) {
        observer.unobserve(targetRef.current);
      }
    };
  }, [handleIntersection, threshold, rootMargin]);

  return targetRef;
}
