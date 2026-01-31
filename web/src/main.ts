/**
 * Main entry point - Portfolio App initialization
 */
import './styles/main.css';

import { renderPortfolioHero, initHeroAnimations } from './components/portfolio-hero';
import { renderPortfolioSkills, initPortfolioSkillsInteraction } from './components/portfolio-skills';
import { renderPortfolioExperience } from './components/portfolio-experience';
import { renderPortfolioAboutYou, initAboutYou } from './components/portfolio-about-you';
import { renderSectionNav, initSectionNav } from './components/section-nav';
import { renderSearchOverlay, initSearch } from './components/search';
import { renderControls, initControls } from './components/controls';
import { applyTheme } from './state/store';
import { initScrollAnimations } from './utils/scroll-animations';
import { initGridPulse } from './utils/grid-pulse';
import { onReady, $ } from './utils/dom';

function render(): void {
  const app = $('#app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  const html = `
    <div class="portfolio-container">
      ${renderPortfolioHero()}
      ${renderPortfolioSkills()}
      ${renderPortfolioExperience()}
      ${renderPortfolioAboutYou()}
    </div>
    ${renderSectionNav()}
    ${renderSearchOverlay()}
    ${renderControls()}
  `;

  app.innerHTML = html;
}

async function init(): Promise<void> {
  // Apply theme immediately
  applyTheme();

  // Render the app
  render();

  // Initialize interactive components
  initPortfolioSkillsInteraction();
  initSectionNav();
  initSearch();
  initControls();

  // Initialize scroll animations
  initScrollAnimations();

  // Initialize grid pulse effects
  initGridPulse();

  // Start hero animations after a brief delay for DOM paint
  requestAnimationFrame(() => {
    initHeroAnimations();
  });

  // Initialize About You section (fetches visitor data)
  initAboutYou();
}

// Start the app when DOM is ready
onReady(init);
