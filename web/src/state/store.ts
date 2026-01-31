/**
 * Minimal reactive store (~500 bytes)
 */

export type SortOrder = 'date' | 'relevance';
export type Theme = 'light' | 'dark' | 'system';

export interface State {
  theme: Theme;
  activeSkillFilter: string | null;
  sortOrder: SortOrder;
  searchQuery: string;
  searchOpen: boolean;
}

type Listener = (state: State) => void;

const STORAGE_KEY = 'resume-state';

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.theme) return parsed.theme as Theme;
    }
  } catch {
    // ignore
  }
  return 'dark';
}

const initialState: State = {
  theme: getInitialTheme(),
  activeSkillFilter: null,
  sortOrder: 'date',
  searchQuery: '',
  searchOpen: false,
};

let state = { ...initialState };
const listeners = new Set<Listener>();

export function getState(): State {
  return state;
}

export function setState(partial: Partial<State>): void {
  state = { ...state, ...partial };

  // Persist theme
  if (partial.theme !== undefined) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: state.theme }));
    } catch {
      // ignore
    }
  }

  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetFilters(): void {
  setState({
    activeSkillFilter: null,
    sortOrder: 'date',
    searchQuery: '',
  });
}

// Theme helpers
export function getEffectiveTheme(): 'light' | 'dark' {
  const { theme } = state;
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme;
}

export function applyTheme(): void {
  const effective = getEffectiveTheme();
  document.documentElement.classList.toggle('dark', effective === 'dark');
}

export function toggleTheme(): void {
  const current = getEffectiveTheme();
  setState({ theme: current === 'dark' ? 'light' : 'dark' });
  applyTheme();
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  applyTheme();

  // Listen for system theme changes
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (state.theme === 'system') {
        applyTheme();
      }
    });
}
