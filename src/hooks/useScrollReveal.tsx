import { useEffect, type RefObject } from 'react';

export function useScrollReveal<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      node.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          node.classList.add('is-visible');
          observer.unobserve(node);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
}
