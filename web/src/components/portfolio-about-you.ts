/**
 * Portfolio About You component - Security awareness reminder
 * Shows visitor's IP, location, and VPN status
 */
import { $ } from '../utils/dom';

interface GeoData {
  ip: string;
  city: string;
  region: string;
  country: string;
  isp: string;
  org: string;
  proxy: boolean;
  hosting: boolean;
  timezone: string;
}

const icons = {
  location: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  globe: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>`,
  server: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>`,
  shield: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
  shieldOff: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01"/></svg>`,
  clock: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
};

export function renderPortfolioAboutYou(): string {
  return `
    <section id="about-you" class="portfolio-section relative overflow-hidden">

      <div class="relative z-10 max-w-4xl mx-auto w-full text-center">
        <!-- Header -->
        <div class="mb-12">
          <p class="text-sm uppercase tracking-widest text-[var(--color-text-muted)] mb-4">You wanted to know about me...</p>
          <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-text)] mb-4">
            This is what I know about <span class="gradient-text">you</span>
          </h2>
          <p class="text-[var(--color-text-muted)] max-w-xl mx-auto">
            A friendly reminder about your digital footprint
          </p>
        </div>

        <!-- Data cards -->
        <div id="visitor-data" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          <!-- Loading state -->
          <div class="col-span-full flex justify-center py-12">
            <div class="flex items-center gap-3 text-[var(--color-text-muted)]">
              <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Analyzing your connection...</span>
            </div>
          </div>
        </div>

        <!-- VPN recommendation -->
        <div id="vpn-recommendation" class="hidden">
          <!-- Will be populated by JS -->
        </div>

        <!-- Footer note -->
        <p class="text-xs text-[var(--color-text-muted)] mt-8">
          This data is publicly available to any website you visit. Stay safe online.
        </p>
      </div>
    </section>
  `;
}

function renderDataCard(icon: string, label: string, value: string, highlight: boolean = false): string {
  const highlightClass = highlight
    ? 'border-green-500/30 bg-green-500/5'
    : '';

  return `
    <div class="glass-card p-4 sm:p-6 text-left ${highlightClass}">
      <div class="flex items-center gap-3 mb-2">
        <span class="text-[var(--color-text-muted)]">${icon}</span>
        <span class="text-sm text-[var(--color-text-muted)] uppercase tracking-wider">${label}</span>
      </div>
      <p class="text-lg sm:text-xl font-medium text-[var(--color-text)] truncate" title="${value}">
        ${value}
      </p>
    </div>
  `;
}

function renderVpnRecommendation(isProtected: boolean): string {
  if (isProtected) {
    return `
      <div class="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-green-500/10 border border-green-500/30">
        <span class="text-green-500 dark:text-green-400">${icons.shield}</span>
        <div class="text-left">
          <p class="font-medium text-green-600 dark:text-green-400">Your connection appears protected</p>
          <p class="text-sm text-[var(--color-text-muted)]">You're likely using a VPN or proxy</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="max-w-xl mx-auto">
      <div class="flex items-start gap-4 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left mb-6">
        <span class="text-amber-500 dark:text-amber-400 flex-shrink-0 mt-1">${icons.shieldOff}</span>
        <div>
          <p class="font-medium text-amber-600 dark:text-amber-400 mb-2">Your real IP is visible</p>
          <p class="text-sm text-[var(--color-text-secondary)] mb-4">
            Consider using a VPN to protect your privacy and hide your location from websites, advertisers, and potential bad actors.
          </p>
          <div class="text-sm text-[var(--color-text-muted)]">
            <p class="font-medium text-[var(--color-text-secondary)] mb-2">Quick VPN options:</p>
            <ul class="space-y-1">
              <li>• <span class="text-[var(--color-text)]">Mullvad</span> — Privacy-focused, no account needed</li>
              <li>• <span class="text-[var(--color-text)]">ProtonVPN</span> — Free tier available, Swiss privacy</li>
              <li>• <span class="text-[var(--color-text)]">Tailscale</span> — Great for developers, WireGuard-based</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function fetchGeoData(): Promise<GeoData | null> {
  try {
    // Using ipapi.co - HTTPS, free tier, includes ASN info for VPN detection
    const response = await fetch('https://ipapi.co/json/');

    if (!response.ok) {
      throw new Error('Failed to fetch geo data');
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.reason || 'API error');
    }

    // Detect VPN/proxy based on common indicators
    const orgLower = (data.org || '').toLowerCase();
    const ispLower = (data.isp || orgLower).toLowerCase();
    const asnLower = (data.asn || '').toLowerCase();

    // Common VPN/datacenter keywords
    const vpnKeywords = [
      'vpn', 'proxy', 'hosting', 'datacenter', 'data center', 'cloud',
      'digitalocean', 'linode', 'vultr', 'aws', 'amazon', 'google cloud',
      'microsoft azure', 'azure', 'ovh', 'hetzner', 'mullvad', 'nordvpn',
      'expressvpn', 'surfshark', 'protonvpn', 'proton', 'private internet',
      'cyberghost', 'windscribe', 'tunnelbear', 'ipvanish', 'hotspot shield'
    ];

    const isLikelyVpn = vpnKeywords.some(keyword =>
      orgLower.includes(keyword) || ispLower.includes(keyword) || asnLower.includes(keyword)
    );

    return {
      ip: data.ip,
      city: data.city || 'Unknown',
      region: data.region || '',
      country: data.country_name || 'Unknown',
      isp: data.org || 'Unknown',
      org: data.asn || '',
      proxy: isLikelyVpn,
      hosting: isLikelyVpn,
      timezone: data.timezone || 'Unknown',
    };
  } catch (error) {
    console.error('Failed to fetch geo data:', error);
    return null;
  }
}

export async function initAboutYou(): Promise<void> {
  const container = $('#visitor-data');
  const vpnContainer = $('#vpn-recommendation');

  if (!container || !vpnContainer) return;

  const geoData = await fetchGeoData();

  if (!geoData) {
    container.innerHTML = `
      <div class="col-span-full text-center py-8">
        <p class="text-[var(--color-text-muted)]">Unable to fetch your connection data</p>
        <p class="text-sm text-[var(--color-text-muted)] opacity-75 mt-2">You might be blocking tracking requests (good for you!)</p>
      </div>
    `;
    return;
  }

  // Determine if likely using VPN/proxy
  const isProtected = geoData.proxy || geoData.hosting;

  // Build location string
  const locationParts = [geoData.city, geoData.region, geoData.country].filter(Boolean);
  const location = locationParts.join(', ') || 'Unknown';

  // Render data cards
  container.innerHTML = `
    ${renderDataCard(icons.globe, 'IP Address', geoData.ip)}
    ${renderDataCard(icons.location, 'Location', location)}
    ${renderDataCard(icons.server, 'ISP', geoData.isp)}
    ${renderDataCard(icons.clock, 'Timezone', geoData.timezone)}
    ${renderDataCard(
      isProtected ? icons.shield : icons.shieldOff,
      'Protection',
      isProtected ? 'VPN/Proxy Detected' : 'Not Protected',
      isProtected
    )}
    ${geoData.org && geoData.org !== geoData.isp ? renderDataCard(icons.server, 'Organization', geoData.org) : ''}
  `;

  // Show VPN recommendation
  vpnContainer.innerHTML = renderVpnRecommendation(isProtected);
  vpnContainer.classList.remove('hidden');
}
