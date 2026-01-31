/**
 * Scroll-triggered animation utilities using Intersection Observer
 */

type AnimationCallback = (element: HTMLElement, isIntersecting: boolean) => void;

interface ObserverOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

const defaultOptions: ObserverOptions = {
  threshold: 0.1,
  rootMargin: '0px',
  once: true,
};

/**
 * Observe elements for scroll-triggered animations
 */
export function observeForAnimation(
  elements: HTMLElement | HTMLElement[] | NodeListOf<Element>,
  callback: AnimationCallback,
  options: ObserverOptions = {}
): () => void {
  const opts = { ...defaultOptions, ...options };
  const observedElements = new Set<Element>();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        callback(el, entry.isIntersecting);

        if (entry.isIntersecting && opts.once) {
          observer.unobserve(el);
          observedElements.delete(el);
        }
      });
    },
    {
      threshold: opts.threshold,
      rootMargin: opts.rootMargin,
    }
  );

  const elementList = elements instanceof HTMLElement
    ? [elements]
    : Array.from(elements);

  elementList.forEach((el) => {
    if (el instanceof HTMLElement) {
      observer.observe(el);
      observedElements.add(el);
    }
  });

  // Return cleanup function
  return () => {
    observedElements.forEach((el) => observer.unobserve(el));
    observer.disconnect();
  };
}

/**
 * Animate skill bars when they come into view
 */
export function initSkillBarAnimations(): () => void {
  const skillBars = document.querySelectorAll('.skill-bar-fill');

  return observeForAnimation(
    skillBars,
    (el, isIntersecting) => {
      if (isIntersecting) {
        el.classList.add('animate');
      }
    },
    { threshold: 0.5 }
  );
}

/**
 * Create a typing effect for an element
 */
export function createTypingEffect(
  element: HTMLElement,
  text: string,
  speed: number = 80
): Promise<void> {
  return new Promise((resolve) => {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.textContent = text;
      resolve();
      return;
    }

    element.textContent = '';
    let index = 0;

    const type = () => {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index++;
        setTimeout(type, speed);
      } else {
        resolve();
      }
    };

    type();
  });
}

/**
 * Add staggered fade-in animation to child elements
 */
export function staggerFadeIn(
  container: HTMLElement,
  selector: string,
  baseDelay: number = 100
): () => void {
  const elements = container.querySelectorAll(selector);

  elements.forEach((el, index) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.opacity = '0';
    htmlEl.style.transform = 'translateY(20px)';
    htmlEl.style.transition = `opacity 0.5s ease-out, transform 0.5s ease-out`;
    htmlEl.style.transitionDelay = `${index * baseDelay}ms`;
  });

  return observeForAnimation(
    container,
    (_, isIntersecting) => {
      if (isIntersecting) {
        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.opacity = '1';
          htmlEl.style.transform = 'translateY(0)';
        });
      }
    },
    { threshold: 0.2 }
  );
}

/**
 * Track active section for navigation dots
 */
export function initSectionObserver(
  sections: HTMLElement[],
  onSectionChange: (sectionId: string) => void
): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          onSectionChange(sectionId);
        }
      });
    },
    {
      threshold: 0.5,
    }
  );

  sections.forEach((section) => observer.observe(section));

  return () => {
    sections.forEach((section) => observer.unobserve(section));
    observer.disconnect();
  };
}

/**
 * Initialize all scroll animations for the portfolio
 */
export function initScrollAnimations(): () => void {
  const cleanups: (() => void)[] = [];

  // Skill bar animations
  cleanups.push(initSkillBarAnimations());

  // Section observer for nav dots
  const sections = Array.from(document.querySelectorAll('.portfolio-section')) as HTMLElement[];
  if (sections.length > 0) {
    cleanups.push(
      initSectionObserver(sections, (sectionId) => {
        // Update nav dots
        document.querySelectorAll('.nav-dot').forEach((dot) => {
          dot.classList.toggle('active', dot.getAttribute('data-section') === sectionId);
        });
      })
    );
  }

  // Return combined cleanup
  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
