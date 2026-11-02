// BulkSkart Official Brand Constants
//
// The header, footer, auth and dashboard logos are the same artwork as /public/bulkskart-logo-*.png,
// resized to 544x132 (about 3x the largest size they are drawn at) and stored losslessly as WebP.
// Importing them lets Vite fingerprint the files under /assets/, which the web server caches for a
// year. Files in /public are served with no-store, so they would be downloaded again on every visit.
import logoDarkUrl from '@/assets/brand/bulkskart-logo-dark.webp';
import logoLightUrl from '@/assets/brand/bulkskart-logo-light.webp';

export const BULKSKART_LOGO_DARK = logoDarkUrl;
export const BULKSKART_LOGO_LIGHT = logoLightUrl;
// Intrinsic size of the two files above; used to reserve space before the image arrives.
export const BULKSKART_LOGO_WIDTH = 544;
export const BULKSKART_LOGO_HEIGHT = 132;

// Full Brand Logo for all Website Pages (Header, Footer, Auth, Dashboard, Invoices, Modals)
export const BULKSKART_FULL_LOGO_URL = '/brand/bulkskart-logo.jpg';
export const BULKSKART_LOGO_URL = BULKSKART_LOGO_DARK;

// Square Emblem Icon for SEO, Google Meta, Favicons, Web Manifest, Apple Touch, payment modals.
// These are the 192px and 48px renditions of /brand/bulkskart-icon.png (1254px, 776 KB) that already ship in /public.
export const BULKSKART_ICON_URL = '/android-chrome-192x192.png';
export const BULKSKART_FAVICON_URL = '/favicon-48x48.png';

export const BULKSKART_BRAND_NAME = 'BulkSkart';
export const BULKSKART_TAGLINE = 'Global B2B Marketplace · Source • Supply • Scale';
