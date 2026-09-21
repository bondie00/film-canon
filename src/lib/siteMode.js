/**
 * Which cut of the site this build is.
 *
 * The public (soft-launch) cut is Home, Explore, the film pages and the voter
 * pages. Everything else — the Countries / Directors / Genres hubs and their
 * detail pages, the single-chart visualizations — stays in the codebase but is
 * not routed, not linked and not searchable in that build.
 *
 * This is a BUILD flag, not a branch: `main` carries both cuts, and the live
 * branch is only a pointer Vercel builds with VITE_SITE_MODE=public. Gating in
 * code keeps the two from diverging — a fix to Explore lands in both at once.
 *
 *   npm run dev          full site        (.env has no mode)
 *   npm run dev:public   public cut       (vite --mode public reads .env.public)
 */
export const PUBLIC_MODE = import.meta.env.VITE_SITE_MODE === 'public'
