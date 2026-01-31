/**
 * Portfolio Skills component - Table-based UI with category tabs
 */
import { getSkills, type Skill } from '../data';
import { getState, setState, subscribe } from '../state/store';
import { transition } from '../utils/transitions';
import { $, $$ } from '../utils/dom';

const CATEGORY_CONFIG: Record<string, { label: string; gradient: string }> = {
  languages: {
    label: 'Languages',
    gradient: 'from-blue-500 to-cyan-400',
  },
  mobile: {
    label: 'Mobile',
    gradient: 'from-green-500 to-emerald-400',
  },
  frameworks: {
    label: 'Frameworks',
    gradient: 'from-purple-500 to-pink-400',
  },
  databases: {
    label: 'Databases',
    gradient: 'from-orange-500 to-amber-400',
  },
  cloud: {
    label: 'Cloud',
    gradient: 'from-sky-500 to-blue-400',
  },
  devops: {
    label: 'DevOps',
    gradient: 'from-indigo-500 to-violet-400',
  },
  testing: {
    label: 'Testing',
    gradient: 'from-teal-500 to-cyan-400',
  },
  tools: {
    label: 'Tools',
    gradient: 'from-gray-500 to-slate-400',
  },
  ai: {
    label: 'AI & ML',
    gradient: 'from-rose-500 to-pink-400',
  },
  domains: {
    label: 'Domains',
    gradient: 'from-fuchsia-500 to-purple-400',
  },
  soft: {
    label: 'Soft Skills',
    gradient: 'from-amber-500 to-yellow-400',
  },
};

const CATEGORY_ORDER = [
  'languages',
  'mobile',
  'frameworks',
  'databases',
  'cloud',
  'devops',
  'testing',
  'tools',
  'ai',
  'domains',
  'soft',
];

// Track the active category (local state, not in global store)
let activeCategory: string = 'languages';

// Calculate max years across all skills for bar scaling
function getMaxYears(categories: Record<string, Skill[]>): number {
  let max = 0;
  for (const skills of Object.values(categories)) {
    for (const skill of skills) {
      if (skill.yearsUsed > max) {
        max = skill.yearsUsed;
      }
    }
  }
  return max || 1; // Prevent division by zero
}

// Calculate max number of skills in any category for fixed height
function getMaxSkillCount(categories: Record<string, Skill[]>): number {
  let max = 0;
  for (const skills of Object.values(categories)) {
    if (skills.length > max) {
      max = skills.length;
    }
  }
  return max;
}

function renderCategoryTabs(availableCategories: string[]): string {
  return `
    <div class="skills-tabs">
      ${availableCategories
        .map((key) => {
          const config = CATEGORY_CONFIG[key] || { label: key, gradient: 'from-gray-500 to-gray-400' };
          const isActive = activeCategory === key;
          return `
          <button
            type="button"
            class="skills-tab ${isActive ? 'active' : ''}"
            data-category="${key}"
            data-gradient="${config.gradient}"
          >
            ${config.label}
          </button>
        `;
        })
        .join('')}
    </div>
  `;
}

function renderSkillRow(skill: Skill, maxYears: number): string {
  const { activeSkillFilter } = getState();
  const isActive = activeSkillFilter === skill.name;
  const barPercent = (skill.yearsUsed / maxYears) * 100;

  return `
    <button
      type="button"
      class="skills-row ${isActive ? 'active' : ''}"
      data-skill="${skill.name}"
    >
      <span class="skills-row-name">${skill.name}</span>
      <div class="skills-row-bar">
        <div class="experience-bar">
          <div
            class="experience-bar-fill"
            style="--bar-percent: ${barPercent}%"
          ></div>
        </div>
        <span class="skills-row-years">${skill.yearsUsed} yr${skill.yearsUsed !== 1 ? 's' : ''}</span>
      </div>
    </button>
  `;
}

function renderSkillsTable(
  categoryKey: string,
  categories: Record<string, Skill[]>,
  maxYears: number,
  maxSkillCount: number
): string {
  const skills = categories[categoryKey] || [];

  // Sort by years of experience (descending)
  const sorted = [...skills].sort((a, b) => b.yearsUsed - a.yearsUsed);

  // Row height is roughly 44px (py-2.5 + content), gap is 4px
  const minHeight = maxSkillCount * 48;

  return `
    <div class="skills-table">
      <div class="skills-table-header">
        <span>Technology</span>
        <span>Experience</span>
      </div>
      <div class="skills-table-body" style="min-height: ${minHeight}px">
        ${sorted.map((skill) => renderSkillRow(skill, maxYears)).join('')}
      </div>
    </div>
  `;
}

export function renderPortfolioSkills(): string {
  const { categories } = getSkills();
  const { activeSkillFilter } = getState();

  const availableCategories = CATEGORY_ORDER.filter(
    (key) => categories[key] && categories[key].length > 0
  );

  // Ensure activeCategory is valid
  if (!availableCategories.includes(activeCategory)) {
    activeCategory = availableCategories[0] || 'languages';
  }

  const maxYears = getMaxYears(categories);
  const maxSkillCount = getMaxSkillCount(categories);

  return `
    <section id="skills" class="portfolio-section">
      <div class="max-w-4xl mx-auto w-full">
        <div class="text-center mb-8">
          <h2 class="section-title gradient-text">Skills & Expertise</h2>
          <p class="section-subtitle">Click any skill to filter experience</p>
        </div>

        ${
          activeSkillFilter
            ? `
          <div class="flex justify-center mb-6">
            <button
              type="button"
              id="clear-skill-filter"
              class="badge hover:bg-accent/20 dark:hover:bg-accent-dark/30 transition-colors cursor-pointer"
            >
              <span>Filtering: ${activeSkillFilter}</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        `
            : ''
        }

        <div id="skills-container">
          ${renderCategoryTabs(availableCategories)}
          ${renderSkillsTable(activeCategory, categories, maxYears, maxSkillCount)}
        </div>
      </div>
    </section>
  `;
}

function updateSkillsTable(): void {
  const container = $('#skills-container');
  if (!container) return;

  const { categories } = getSkills();
  const availableCategories = CATEGORY_ORDER.filter(
    (key) => categories[key] && categories[key].length > 0
  );
  const maxYears = getMaxYears(categories);
  const maxSkillCount = getMaxSkillCount(categories);

  container.innerHTML = `
    ${renderCategoryTabs(availableCategories)}
    ${renderSkillsTable(activeCategory, categories, maxYears, maxSkillCount)}
  `;

  // Trigger bar animation
  requestAnimationFrame(() => {
    $$('.experience-bar-fill').forEach((el) => {
      el.classList.add('animate');
    });
  });
}

export function initPortfolioSkillsInteraction(): void {
  const container = $('#skills-container');
  if (!container) return;

  // Tab click handler
  container.addEventListener('click', (e) => {
    const tabTarget = (e.target as HTMLElement).closest('.skills-tab') as HTMLElement | null;
    if (tabTarget) {
      const categoryKey = tabTarget.getAttribute('data-category');
      if (categoryKey && categoryKey !== activeCategory) {
        activeCategory = categoryKey;
        updateSkillsTable();
      }
      return;
    }

    // Skill row click handler
    const rowTarget = (e.target as HTMLElement).closest('.skills-row') as HTMLElement | null;
    if (rowTarget) {
      const skillName = rowTarget.getAttribute('data-skill');
      if (!skillName) return;

      const { activeSkillFilter } = getState();

      transition(() => {
        if (activeSkillFilter === skillName) {
          setState({ activeSkillFilter: null });
        } else {
          setState({ activeSkillFilter: skillName });
        }
      });
    }
  });

  // Clear filter button
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('#clear-skill-filter')) {
      transition(() => {
        setState({ activeSkillFilter: null });
      });
    }
  });

  // Trigger initial bar animation
  requestAnimationFrame(() => {
    $$('.experience-bar-fill').forEach((el) => {
      el.classList.add('animate');
    });
  });
}

// Update skill rows when filter changes
subscribe((state) => {
  $$('.skills-row').forEach((el) => {
    const skillName = el.getAttribute('data-skill');
    const isActive = state.activeSkillFilter === skillName;
    el.classList.toggle('active', isActive);
  });
});
