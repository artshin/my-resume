/**
 * Search component - Cmd+K overlay with fuzzy matching
 */
import { getJobs, getAllSkillNames, type NormalizedJob } from '../data';
import { getState, setState, subscribe } from '../state/store';
import { $, $$ } from '../utils/dom';

interface SearchResult {
  type: 'job' | 'skill';
  title: string;
  subtitle?: string;
  data: NormalizedJob | string;
}

// Simple trigram-based fuzzy matching
function buildTrigrams(str: string): Set<string> {
  const s = str.toLowerCase().padStart(2, ' ').padEnd(str.length + 2, ' ');
  const trigrams = new Set<string>();
  for (let i = 0; i <= s.length - 3; i++) {
    trigrams.add(s.slice(i, i + 3));
  }
  return trigrams;
}

function trigramSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  a.forEach((t) => {
    if (b.has(t)) intersection++;
  });
  return intersection / Math.max(a.size, b.size);
}

function searchItems(query: string): SearchResult[] {
  if (!query || query.length < 2) return [];

  const queryTrigrams = buildTrigrams(query);
  const results: Array<SearchResult & { score: number }> = [];
  const lowerQuery = query.toLowerCase();

  // Search jobs
  getJobs().forEach((job) => {
    const titleTrigrams = buildTrigrams(job.title);
    const companyTrigrams = buildTrigrams(job.companyName);
    const techText = job.technologies.join(' ');
    const techTrigrams = buildTrigrams(techText);

    const titleScore = trigramSimilarity(queryTrigrams, titleTrigrams);
    const companyScore = trigramSimilarity(queryTrigrams, companyTrigrams);
    const techScore = trigramSimilarity(queryTrigrams, techTrigrams);

    const maxScore = Math.max(titleScore, companyScore, techScore);

    // Also check for direct substring match
    const hasSubstring =
      job.title.toLowerCase().includes(lowerQuery) ||
      job.companyName.toLowerCase().includes(lowerQuery) ||
      techText.toLowerCase().includes(lowerQuery);

    if (maxScore > 0.3 || hasSubstring) {
      results.push({
        type: 'job',
        title: job.title,
        subtitle: `${job.companyName} · ${job.startDate}`,
        data: job,
        score: hasSubstring ? 1 : maxScore,
      });
    }
  });

  // Search skills
  getAllSkillNames().forEach((skill) => {
    const skillTrigrams = buildTrigrams(skill);
    const score = trigramSimilarity(queryTrigrams, skillTrigrams);
    const hasSubstring = skill.toLowerCase().includes(lowerQuery);

    if (score > 0.3 || hasSubstring) {
      results.push({
        type: 'skill',
        title: skill,
        subtitle: 'Skill',
        data: skill,
        score: hasSubstring ? 1 : score,
      });
    }
  });

  // Sort by score and limit
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ score: _score, ...rest }) => rest);
}

export function renderSearchOverlay(): string {
  return `
    <div id="search-overlay" class="hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in print:hidden" role="dialog" aria-modal="true" aria-labelledby="search-title">
      <div class="flex items-start justify-center pt-[20vh] px-4">
        <div class="w-full max-w-lg glass-card rounded-xl shadow-2xl overflow-hidden dark:shadow-[0_0_40px_rgba(0,212,255,0.15)]">
          <div class="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
            <svg class="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              id="search-input"
              class="flex-1 bg-transparent text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none"
              placeholder="Search jobs, skills, technologies..."
              autocomplete="off"
              aria-describedby="search-title"
            />
            <kbd class="hidden sm:inline-block px-2 py-1 text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded">ESC</kbd>
          </div>
          <div id="search-results" class="max-h-80 overflow-y-auto">
            <p id="search-title" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              Type to search...
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return `
      <p class="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        No results found
      </p>
    `;
  }

  return `
    <ul role="listbox" class="py-2">
      ${results.map((result, index) => `
        <li
          role="option"
          data-index="${index}"
          data-type="${result.type}"
          data-value="${result.type === 'skill' ? result.data : (result.data as NormalizedJob).id}"
          class="search-result ${index === 0 ? 'selected' : ''}"
          tabindex="0"
        >
          <div class="flex items-center gap-3">
            <span class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${result.type === 'job' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}">
              ${result.type === 'job'
                ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>'
                : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>'
              }
            </span>
            <div>
              <div class="font-medium text-gray-900 dark:text-gray-100">${result.title}</div>
              ${result.subtitle ? `<div class="text-sm text-gray-500 dark:text-gray-400">${result.subtitle}</div>` : ''}
            </div>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

let selectedIndex = 0;

function updateSelection(newIndex: number): void {
  const results = $$('.search-result');
  if (results.length === 0) return;

  selectedIndex = Math.max(0, Math.min(newIndex, results.length - 1));

  results.forEach((el, i) => {
    el.classList.toggle('selected', i === selectedIndex);
  });

  results[selectedIndex]?.scrollIntoView({ block: 'nearest' });
}

function selectResult(): void {
  const results = $$('.search-result');
  const selected = results[selectedIndex];
  if (!selected) return;

  const type = selected.getAttribute('data-type');
  const value = selected.getAttribute('data-value');

  closeSearch();

  if (type === 'skill' && value) {
    setState({ activeSkillFilter: value });
  } else if (type === 'job' && value) {
    // Scroll to and expand the job card
    const jobCard = $(`[data-job-id="${value}"]`) as HTMLDetailsElement | null;
    if (jobCard) {
      jobCard.open = true;
      jobCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

export function openSearch(): void {
  const overlay = $('#search-overlay');
  const input = $('#search-input') as HTMLInputElement | null;

  if (overlay && input) {
    overlay.classList.remove('hidden');
    input.value = '';
    input.focus();
    selectedIndex = 0;
    setState({ searchOpen: true });
  }
}

export function closeSearch(): void {
  const overlay = $('#search-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    setState({ searchOpen: false, searchQuery: '' });
  }
}

export function initSearch(): void {
  const overlay = $('#search-overlay');
  const input = $('#search-input') as HTMLInputElement | null;
  const resultsContainer = $('#search-results');

  if (!overlay || !input || !resultsContainer) return;

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSearch();
  });

  // Input handling
  input.addEventListener('input', () => {
    const query = input.value.trim();
    setState({ searchQuery: query });

    if (query.length < 2) {
      resultsContainer.innerHTML = `
        <p class="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
          Type to search...
        </p>
      `;
      return;
    }

    const results = searchItems(query);
    resultsContainer.innerHTML = renderResults(results);
    selectedIndex = 0;
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        updateSelection(selectedIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        updateSelection(selectedIndex - 1);
        break;
      case 'Enter':
        e.preventDefault();
        selectResult();
        break;
      case 'Escape':
        closeSearch();
        break;
    }
  });

  // Click on result
  resultsContainer.addEventListener('click', (e) => {
    const result = (e.target as HTMLElement).closest('.search-result');
    if (result) {
      const index = parseInt(result.getAttribute('data-index') || '0', 10);
      selectedIndex = index;
      selectResult();
    }
  });

  // Global keyboard shortcut
  document.addEventListener('keydown', (e) => {
    // Cmd+K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (getState().searchOpen) {
        closeSearch();
      } else {
        openSearch();
      }
    }
  });
}

// Close search when filter is cleared
subscribe((state) => {
  if (!state.searchOpen && $('#search-overlay')) {
    closeSearch();
  }
});
