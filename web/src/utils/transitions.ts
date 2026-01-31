/**
 * View Transitions API wrapper with fallback
 */

type TransitionCallback = () => void | Promise<void>;

export function supportsViewTransitions(): boolean {
  return 'startViewTransition' in document;
}

export async function transition(callback: TransitionCallback): Promise<void> {
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await callback();
    return;
  }

  if (supportsViewTransitions()) {
    const doc = document as Document & {
      startViewTransition: (cb: TransitionCallback) => { finished: Promise<void> };
    };
    const t = doc.startViewTransition(callback);
    await t.finished;
  } else {
    await callback();
  }
}

export function setViewTransitionName(el: HTMLElement, name: string): void {
  el.style.viewTransitionName = name;
}

export function clearViewTransitionName(el: HTMLElement): void {
  el.style.viewTransitionName = '';
}
