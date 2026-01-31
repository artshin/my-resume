/**
 * Section Navigation component - Fixed dots on right side
 */
import { $ } from '../utils/dom';

interface Section {
  id: string;
  label: string;
}

const SECTIONS: Section[] = [
  { id: 'hero', label: 'Home' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'about-you', label: 'About You' },
];

export function renderSectionNav(): string {
  const dots = SECTIONS.map((section, index) => `
    <button
      type="button"
      class="nav-dot ${index === 0 ? 'active' : ''}"
      data-section="${section.id}"
      data-label="${section.label}"
      aria-label="Go to ${section.label}"
      title="${section.label}"
    ></button>
  `).join('');

  return `
    <nav class="section-nav print:hidden" aria-label="Section navigation">
      ${dots}
    </nav>
  `;
}

export function initSectionNav(): void {
  const container = $('.portfolio-container');
  if (!container) return;

  // Click handlers for nav dots
  document.querySelectorAll('.nav-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      const sectionId = dot.getAttribute('data-section');
      if (!sectionId) return;

      const section = $(`#${sectionId}`);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Intersection Observer for active state
  const sections = SECTIONS.map((s) => $(`#${s.id}`)).filter(Boolean) as HTMLElement[];

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;

          document.querySelectorAll('.nav-dot').forEach((dot) => {
            dot.classList.toggle('active', dot.getAttribute('data-section') === sectionId);
          });
        }
      });
    },
    {
      threshold: 0.5,
    }
  );

  sections.forEach((section) => observer.observe(section));
}
