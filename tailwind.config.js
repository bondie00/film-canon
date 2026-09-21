/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#10b981',
        accent: '#8b5cf6',
      },
      // The one breakpoint past Tailwind's own: an external widescreen monitor.
      // Laptops (up to ~1800 CSS px) keep the column caps they always had;
      // above that the caps step up so the page fills more of the screen.
      screens: {
        '3xl': '1800px',
        // Wide enough for the homepage's longest poll shelf (1952: 12 films
        // plus the Explore cap, 13 × 140px + 12 gaps ≈ 1950px) to sit in one
        // centred row without scrolling, with a margin either side.
        '4xl': '2100px',
      },
      // The widescreen column caps, in px so the 90% root font size doesn't
      // shrink them. `wide` is the grid/shelf pages and the header; `narrow`
      // is the film and voter pages, a single column of prose and small charts.
      maxWidth: {
        wide: '1600px',
        narrow: '1080px',
      },
    },
  },
  plugins: [],
}
