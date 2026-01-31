/**
 * Portfolio Experience component - Full-viewport timeline with internal scroll
 */
import { getJobs, type NormalizedJob } from '../data';
import { getState, subscribe } from '../state/store';
import { formatDateRange, formatDuration } from '../utils/format';
import { $$ } from '../utils/dom';

function jobMatchesFilter(job: NormalizedJob, filter: string | null): boolean {
  if (!filter) return true;

  const lowerFilter = filter.toLowerCase();

  // Check technologies
  if (job.technologies.some((t) => t.toLowerCase().includes(lowerFilter))) {
    return true;
  }

  // Check achievements and responsibilities
  const allText = [
    ...job.achievements,
    ...job.responsibilities,
    job.companyDescription || '',
  ].join(' ').toLowerCase();

  return allText.includes(lowerFilter);
}

function renderJobCard(job: NormalizedJob, isFiltered: boolean, index: number): string {
  const dateRange = formatDateRange(job.startDate, job.endDate);
  const duration = formatDuration(job.startDate, job.endDate);
  const isPresent = !job.endDate || job.endDate.toLowerCase() === 'present';

  const filteredClass = isFiltered
    ? 'opacity-100 scale-100'
    : 'opacity-30 scale-[0.98]';

  const presentBadge = isPresent
    ? '<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">Current</span>'
    : '';

  return `
    <div class="relative pl-8">
      <!-- Timeline dot -->
      <div class="timeline-dot"></div>

      <details
        class="job-card glass-card group ${filteredClass} transition-all duration-300"
        data-job-id="${job.id}"
        data-technologies="${job.technologies.join(',').toLowerCase()}"
        style="animation-delay: ${index * 100}ms"
      >
        <summary class="cursor-pointer list-none select-none p-4 sm:p-6">
          <div class="flex flex-col gap-2">
            <!-- Header row -->
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                  ${job.title}
                </h3>
                ${presentBadge}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400 sm:text-right whitespace-nowrap">
                ${dateRange}
                ${duration ? `<span class="text-xs text-gray-400 dark:text-gray-500 ml-1">(${duration})</span>` : ''}
              </div>
            </div>

            <!-- Company and location -->
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <span class="font-medium text-gray-700 dark:text-gray-300">${job.companyName}</span>
              <span class="text-gray-400">·</span>
              <span class="text-gray-500 dark:text-gray-400">${job.location}</span>
            </div>

            ${job.companyDescription ? `
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 group-open:line-clamp-none">
                ${job.companyDescription}
              </p>
            ` : ''}

            <!-- Tech tags preview -->
            ${job.technologies.length > 0 ? `
              <div class="flex flex-wrap gap-1.5 mt-2">
                ${job.technologies.slice(0, 5).map((tech) => `
                  <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-accent/10 dark:bg-accent-dark/20 text-accent dark:text-accent-dark">
                    ${tech}
                  </span>
                `).join('')}
                ${job.technologies.length > 5 ? `
                  <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    +${job.technologies.length - 5} more
                  </span>
                ` : ''}
              </div>
            ` : ''}

            <!-- Expand indicator -->
            <div class="flex items-center gap-2 mt-3 text-xs text-accent dark:text-accent-dark">
              <span class="group-open:hidden">Show details</span>
              <span class="hidden group-open:inline">Hide details</span>
              <svg class="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>
        </summary>

        <!-- Expanded content -->
        <div class="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 animate-slide-down">
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            ${job.technologies.length > 0 ? `
              <div class="mb-4">
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Technologies</h4>
                <div class="flex flex-wrap gap-1.5">
                  ${job.technologies.map((tech) => `
                    <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-accent/10 dark:bg-accent-dark/20 text-accent dark:text-accent-dark">
                      ${tech}
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${job.responsibilities.length > 0 ? `
              <div class="mb-4">
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Responsibilities</h4>
                <ul class="space-y-2">
                  ${job.responsibilities.map((r) => `
                    <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span class="w-1.5 h-1.5 rounded-full bg-accent dark:bg-accent-dark mt-1.5 flex-shrink-0"></span>
                      ${r}
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            ${job.achievements.length > 0 ? `
              <div>
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Achievements</h4>
                <ul class="space-y-2">
                  ${job.achievements.map((a) => `
                    <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      ${a}
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
      </details>
    </div>
  `;
}

export function renderPortfolioExperience(): string {
  const jobs = getJobs();
  const { activeSkillFilter } = getState();

  const jobCards = jobs.map((job, index) => {
    const matches = jobMatchesFilter(job, activeSkillFilter);
    return renderJobCard(job, matches, index);
  }).join('');

  return `
    <section id="experience" class="portfolio-section flow-section">
      <div class="max-w-4xl mx-auto w-full">
        <div class="text-center mb-8">
          <h2 class="section-title gradient-text">Experience</h2>
          <p class="section-subtitle">14+ years building software</p>
        </div>

        <!-- Timeline container -->
        <div class="timeline-container relative pl-4">
          <!-- Timeline line -->
          <div class="timeline-line"></div>

          <!-- Job cards -->
          <div id="timeline-jobs" class="space-y-6">
            ${jobCards}
          </div>
        </div>
      </div>
    </section>
  `;
}

export function updateExperienceFilter(): void {
  const { activeSkillFilter } = getState();

  $$('.job-card').forEach((card) => {
    const techs = card.getAttribute('data-technologies') || '';
    const matches = !activeSkillFilter ||
      techs.includes(activeSkillFilter.toLowerCase());

    card.classList.toggle('opacity-30', !matches);
    card.classList.toggle('scale-[0.98]', !matches);
    card.classList.toggle('opacity-100', matches);
    card.classList.toggle('scale-100', matches);
  });
}

// Subscribe to state changes
subscribe((state) => {
  if (state.activeSkillFilter !== undefined) {
    updateExperienceFilter();
  }
});
