// Google Analytics (GA4) integration for the admin dashboard.
// Set VITE_GA_MEASUREMENT_ID (e.g. "G-XXXXXXXXXX") in .env.production to enable.
import ReactGA from 'react-ga4';

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

let initialized = false;

export function initGA() {
  if (!MEASUREMENT_ID || initialized) return;
  try {
    ReactGA.initialize(MEASUREMENT_ID);
    initialized = true;
  } catch (e) {
    console.warn('[GA] initialize failed', e);
  }
}

/** Page-view tracking — call on every route change. */
export function trackPage(path) {
  if (!initialized) return;
  ReactGA.send({ hitType: 'pageview', page: path });
}

/** Custom event tracking, e.g. trackEvent('auth', 'login_success'). */
export function trackEvent(category, action, label = '', value) {
  if (!initialized) return;
  ReactGA.event({ category, action, label, value });
}

export const gaEnabled = Boolean(MEASUREMENT_ID);
