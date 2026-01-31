/**
 * Portfolio Hero component - Full-viewport dramatic introduction
 */
import { getProfile } from '../data';
import { createTypingEffect } from '../utils/scroll-animations';
import { $ } from '../utils/dom';

const icons = {
  linkedin: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  github: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`,
  chevronDown: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`,
};

export function renderPortfolioHero(): string {
  const profile = getProfile();
  const { contact } = profile;

  return `
    <section id="hero" class="portfolio-section relative overflow-hidden">
      <!-- Animated background -->
      <div class="hero-bg">
        <div class="hero-blob hero-blob-1"></div>
        <div class="hero-blob hero-blob-2"></div>
        <div class="hero-blob hero-blob-3"></div>
      </div>

      <!-- Content -->
      <div class="relative z-10 text-center max-w-4xl mx-auto">
        <!-- Name with typing effect -->
        <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 text-gray-900 dark:text-white">
          <span id="hero-name" class="inline-block"></span>
          <span id="hero-cursor" class="inline-block w-1 h-12 sm:h-16 md:h-20 bg-accent animate-blink ml-1"></span>
        </h1>

        <!-- Role/Title -->
        <p id="hero-title" class="text-xl sm:text-2xl md:text-3xl font-medium text-gray-600 dark:text-gray-300 mb-6 opacity-0">
          ${profile.targetRoles?.[0] || 'Software Engineer'}
        </p>

        <!-- Tagline from summary (first sentence) -->
        <p id="hero-tagline" class="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 opacity-0 leading-relaxed">
          ${profile.summary.split('.')[0]}.
        </p>

        <!-- Social links -->
        <div id="hero-socials" class="flex flex-wrap justify-center gap-4 opacity-0">
          ${contact.linkedin ? `
            <a
              href="${contact.linkedin}"
              target="_blank"
              rel="noopener noreferrer"
              class="social-btn social-btn-primary"
            >
              ${icons.linkedin}
              <span>Connect on LinkedIn</span>
            </a>
          ` : ''}
          ${contact.github ? `
            <a
              href="${contact.github}"
              target="_blank"
              rel="noopener noreferrer"
              class="social-btn social-btn-secondary"
            >
              ${icons.github}
              <span>View GitHub</span>
            </a>
          ` : ''}
        </div>
      </div>

      <!-- Scroll indicator -->
      <div class="scroll-indicator print:hidden">
        <span>Scroll</span>
        ${icons.chevronDown}
      </div>
    </section>
  `;
}

export async function initHeroAnimations(): Promise<void> {
  const nameEl = $('#hero-name');
  const cursorEl = $('#hero-cursor');
  const titleEl = $('#hero-title');
  const taglineEl = $('#hero-tagline');
  const socialsEl = $('#hero-socials');

  if (!nameEl) return;

  const profile = getProfile();

  // Type the name
  await createTypingEffect(nameEl, profile.name, 80);

  // Hide cursor after typing
  if (cursorEl) {
    cursorEl.classList.remove('animate-blink');
    cursorEl.style.opacity = '0';
  }

  // Fade in title
  if (titleEl) {
    titleEl.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    titleEl.style.transform = 'translateY(20px)';
    requestAnimationFrame(() => {
      titleEl.style.opacity = '1';
      titleEl.style.transform = 'translateY(0)';
    });
  }

  // Fade in tagline after title
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (taglineEl) {
    taglineEl.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    taglineEl.style.transform = 'translateY(20px)';
    requestAnimationFrame(() => {
      taglineEl.style.opacity = '1';
      taglineEl.style.transform = 'translateY(0)';
    });
  }

  // Fade in social buttons
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (socialsEl) {
    socialsEl.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    socialsEl.style.transform = 'translateY(20px)';
    requestAnimationFrame(() => {
      socialsEl.style.opacity = '1';
      socialsEl.style.transform = 'translateY(0)';
    });
  }
}
