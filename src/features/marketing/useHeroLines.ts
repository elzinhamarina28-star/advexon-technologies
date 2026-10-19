// src/features/marketing/useHeroLines.ts
import { useEffect } from 'react';

type Opts = {
  selector?: string;
  groupAttr?: 'data-side' | null;
  groupInterval?: number;
  perGroup?: number;
  cyclePause?: number;
};

export function useHeroLines(opts: Partial<Opts> = {}) {
  const {
    selector = '.hero-ribbon .cycle-line',
    groupAttr = 'data-side',
    groupInterval = 700,
    perGroup = 2,
    cyclePause = 2000,
  } = opts;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const nodes = Array.from(document.querySelectorAll<SVGPathElement>(selector));
    if (!nodes.length) return;

    const left = nodes.filter(n => n.getAttribute('data-side') === 'left' || n.classList.contains('cycle-left'));
    const right = nodes.filter(n => n.getAttribute('data-side') === 'right' || n.classList.contains('cycle-right'));
    const neutral = nodes.filter(n => !left.includes(n) && !right.includes(n));
    const groups = [left, right, neutral].filter(g => g.length > 0);

    let stopped = false;

    const animateBatch = async (arr: SVGPathElement[]) => {
      for (let i = 0; i < arr.length && !stopped; i += perGroup) {
        const batch = arr.slice(i, i + perGroup);
        batch.forEach(el => el.classList.add('is-animating'));
        await new Promise(res => setTimeout(res, groupInterval));
        batch.forEach(el => el.classList.remove('is-animating'));
      }
    };

    const run = async () => {
      while (!stopped) {
        for (const g of groups) {
          if (stopped) break;
          await animateBatch(g);
          await new Promise(res => setTimeout(res, 220));
        }
        await new Promise(res => setTimeout(res, cyclePause));
      }
    };

    run();

    return () => { stopped = true; };
  }, [selector, groupInterval, perGroup, cyclePause]);
}
