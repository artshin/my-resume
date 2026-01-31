/**
 * Controls component - Theme toggle only
 */
import { toggleTheme, getEffectiveTheme } from '../state/store';
import { openSearch } from './search';
import { $ } from '../utils/dom';

const icons = {
  sun: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
  moon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`,
  search: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`,
};

export function renderControls(): string {
  const theme = getEffectiveTheme();

  return `
    <div id="controls" class="fixed bottom-4 right-4 flex items-center gap-2 z-40 print:hidden">
      <button
        type="button"
        id="search-btn"
        class="control-btn"
        aria-label="Search (Cmd+K)"
        title="Search (Cmd+K)"
      >
        ${icons.search}
      </button>

      <button
        type="button"
        id="theme-toggle"
        class="control-btn"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        ${theme === 'dark' ? icons.sun : icons.moon}
      </button>
    </div>
  `;
}

export function initControls(): void {
  const searchBtn = $('#search-btn');
  const themeToggle = $('#theme-toggle');

  if (searchBtn) {
    searchBtn.addEventListener('click', openSearch);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      toggleTheme();
      updateThemeIcon();
    });
  }
}

function updateThemeIcon(): void {
  const themeToggle = $('#theme-toggle');
  if (themeToggle) {
    const theme = getEffectiveTheme();
    themeToggle.innerHTML = theme === 'dark' ? icons.sun : icons.moon;
  }
}
