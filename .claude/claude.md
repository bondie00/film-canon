# Sight & Sound Canon Explorer - Claude Code Project Guide

## Project Overview

This is a data visualization and database platform called the **Sight & Sound Canon Explorer**. It transforms the Sight & Sound Greatest Films poll data into an interactive exploration experience.

**Core Dataset:**
- 4,851 films (total unique films that received at least 1 vote across all polls)
- Eight polls: 1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022
- 117 unique countries represented
- 3,817 films received votes in 2022 poll (most comprehensive)
- Detailed information: rankings, vote counts, directors, production years, countries of origin
- Multiple directors and countries supported (semicolon-separated array columns)
- Top film in 2022: "Jeanne Dielman, 23, Quai du Commerce, 1080 Bruxelles" (215 votes)

**Unique Value Proposition:**
- Complete record of EVERY film with at least 1 vote (not just top 100)
- Dual focus: consensus canon AND diversity of taste (long-tail analysis)
- Historical tracking across multiple poll years
- Geographic insights with country-by-country breakdowns
- Temporal patterns showing which decades produced canonical films

**Current Deployment:**
- Existing searchable database: https://parcel-react-ebon.vercel.app
- GitHub repo: https://github.com/bondie00/parcel-react

---

## Technical Stack

### Frontend
- **Framework:** React 18+
- **Styling:** Tailwind CSS
- **Charts/Visualizations:** Recharts (for bar charts, treemaps) + D3.js (for maps, complex visualizations)
- **Routing:** React Router v6
- **Build Tool:** Vite or Next.js
- **Typography:** Google Fonts - Oswald (headers), Inter (body)

### Backend/Data (Future)
- **API:** Node.js + Express or Next.js API routes
- **Database:** PostgreSQL
- **Caching:** Redis for frequently accessed data
- **Deployment:** Vercel (frontend + serverless functions)

### Design Elements
- Film grain texture effects for thematic consistency
- Aesthetic inspiration from Criterion Collection design philosophy
- Clean, professional interfaces with subtle thematic elements

### **Source Data File**
**Critical:** The complete dataset is in an Excel file: `sight_and_sound.xlsx`

**File Structure:**
- **"main data" sheet** - PRIMARY SHEET (4,851 films × 26 columns) - **USE THIS FOR ALL VISUALIZATIONS**
- **"votes per poll" sheet** - Aggregated poll data (8,340 rows with Poll Year, Rank, Votes, Film Title)
- **Individual poll sheets:**
  - **"1952"** - 47 voters → 545 total votes across 199 films (~11.6 votes/voter)
  - **"1962"** - 45 voters → 571 total votes across 199 films (~12.7 votes/voter)
  - **"1972"** - 81 voters → 827 total votes across 363 films (~10.2 votes/voter)
  - **"1982"** - 122 voters → 1,239 total votes across 554 films (~10.2 votes/voter)
  - **"1992"** - 130 voters → 1,314 total votes across 583 films (~10.1 votes/voter)
  - **"2002"** - 145 voters → 1,462 total votes across 630 films (~10.1 votes/voter)
  - **"2012"** - 846 voters → 8,456 total votes across 2,001 films (~10.0 votes/voter)
  - **"2022"** - 1,635 voters → 16,283 total votes across 3,817 films (~10.0 votes/voter)

**Note on Ballot Formats:**
- **1952**: Variable-length ballots (voters submitted varying numbers of films)
- **1962-2022**: Target of 10 films per ballot, though some voters submitted slightly more or fewer

**How to Load Data:**
```javascript
// Using pandas in Python (for data processing/API)
import pandas as pd
df = pd.read_excel('sight_and_sound.xlsx', sheet_name='main data')

// Using a JavaScript library (for frontend)
import * as XLSX from 'xlsx';
const workbook = XLSX.readFile('sight_and_sound.xlsx');
const mainData = XLSX.utils.sheet_to_json(workbook.Sheets['main data']);

// Note: Consider converting to JSON for frontend performance
// Pre-process the Excel file into optimized JSON for web use
```

**Data Conversion Recommendation:**
For production, convert the Excel file to JSON format for faster loading:
- `films.json` - Main film data (processed from "main data" sheet)
- `countries.json` - Pre-aggregated country statistics
- `directors.json` - Pre-aggregated director statistics
- `polls.json` - Poll-specific summary data

**IMPORTANT:** The "main data" sheet is your single source of truth for film information and poll rankings. The other sheets are supplementary.

---

## Project Architecture

### Site Structure
```
Home (Landing Page)
│
├── Visualizations Hub
│   ├── By Country (main visualization page)
│   │   └── Individual Country Pages (future)
│   ├── By Director (future)
│   └── Timeline (future)
│
├── Database (existing searchable database)
│
├── About
│
└── Blog
```

### File Structure (Current Prototypes)
```
/src
  /components
    - Header.jsx (reusable)
    - Footer.jsx (reusable)
  /pages
    - LandingPage.jsx (prototype exists)
    - CountryOriginMain.jsx (prototype exists)
    - [other pages to be built]
  /data
    - [JSON data files or API integration]
```

---

## Design System

### Color Palette
```javascript
// Primary Colors
const colors = {
  primary: '#2563eb',      // blue-600
  secondary: '#10b981',    // green-600
  accent: '#8b5cf6',       // purple-600

  // Semantic
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Neutrals
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray600: '#4b5563',
  gray900: '#111827'
};

// Continent Colors
const continentColors = {
  europe: '#3b82f6',       // blue
  asia: '#10b981',         // green
  northAmerica: '#8b5cf6', // purple
  latinAmerica: '#f59e0b', // orange
  africa: '#ef4444',       // red
  oceania: '#ec4899'       // pink
};
```

### Typography Scale
```javascript
// Headings (font-bold)
h1: 'text-4xl',  // 36px
h2: 'text-3xl',  // 30px
h3: 'text-2xl',  // 24px
h4: 'text-xl',   // 20px

// Body
large: 'text-lg',   // 18px
normal: 'text-base', // 16px
small: 'text-sm',   // 14px
tiny: 'text-xs'     // 12px
```

### Spacing Conventions
```javascript
2:  '8px',   // compact elements
4:  '16px',  // standard gap
6:  '24px',  // card padding
8:  '32px',  // section gap
12: '48px',  // section padding
16: '64px'   // large section padding
```

### Component Patterns
```jsx
// Standard Card
<div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">

// Primary Button
<button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">

// Secondary Button
<button className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
```

---

## Key Pages & Components

### 1. Landing Page (`/`)
**Purpose:** Main entry point with search and navigation

**Key Sections:**
- Hero section with main search bar
- Two prominent navigation cards: Visualizations (blue) and Database (green)
- Quick stats bar (4 cards: Total Films, Poll Years, Contributors, Countries)
- About section explaining unique value prop
- Blog posts section (3-column grid)

**Component Breakdown:**
- Header (persistent across all pages)
- SearchHero
- StatsBar
- AboutSection
- BlogPostCard (reusable)
- Footer (persistent across all pages)

### 2. Country Origin Main Page (`/visualizations/country`)
**Purpose:** Overview and comparison of films by country

**Layout:**
- Sticky left sidebar (3 cols) with filters
- Main content area (9 cols) with visualizations

**Filters Available:**
1. **Poll Selection** (dropdown):
   - All Polls Combined
   - 2022 (Latest)
   - 2012, 2002, 1992, 1982, 1972, 1962, 1952
   - *Future: Compare Two Polls mode, Date Range mode*

2. **Film Rank Range** (segmented control - 2-button toggle):
   - All Films
   - Top 100 Only
   - *Rationale: Binary choice focuses on core use case (elite canon vs. full periphery). Additional tiers (250, 500, 1000) removed as they don't meaningfully differ from Top 100 for most analyses.*

**Filter Behavior:**
- **Auto-applying:** Filters apply immediately on change - no "Apply" button needed
- **No summary box:** Removed "Currently Showing" display to reduce clutter
- **Sticky positioning:** Filter sidebar remains visible while scrolling through visualizations
- **Clean UI:** Segmented control provides cleaner interface than radio buttons for binary choice

**Visualizations:**
1. Quick Stats Bar (4 metrics)
2. World Map (Choropleth) - color by film count
3. Bar Chart - Top Countries (customizable top N)
4. Decade Heatmap - Countries × Decades
5. Treemap - Continental breakdown
6. Key Insights Section
7. Navigation to individual country pages

---

## Data Structures

### Source Data: Excel File Structure
**File:** `sight_and_sound.xlsx`
**Total Records:** 4,851 films

**Column Schema (26 columns):**
```javascript
{
  // Identifiers
  key: number,                    // Unique film ID
  databaseFilmTitle: string,      // Canonical film title for database
  FilmTitle: string,              // Display title
  AlternateTitle: string,         // Alternative title (if any)
  ARR_TitleArray: string,         // Array of all title variations

  // Film Metadata
  Year: string|number,            // Production year (e.g., "1958", "1960-1964")
  Director: string,               // Primary director name
  ARR_DirectorArray: string,      // Semicolon-separated multiple directors
  Country: string,                // Primary country (or combination like "France, Chile")
  ARR_CountryArray: string,       // Semicolon-separated countries (e.g., "United States; United Kingdom")

  // Poll Data (8 polls × 2 columns each = 16 columns)
  // Pattern: {YEAR}rank and {YEAR}votes
  "1952rank": float,              // Rank in 1952 poll (NaN if not ranked)
  "1952votes": number,            // Number of votes in 1952 (0 if none)
  "1962rank": float,
  "1962votes": number,
  "1972rank": float,
  "1972votes": number,
  "1982rank": float,
  "1982votes": number,
  "1992rank": float,
  "1992votes": number,
  "2002rank": float,
  "2002votes": number,
  "2012rank": float,
  "2012votes": number,
  "2022rank": float,
  "2022votes": number
}
```

### Key Data Patterns
```javascript
// Films with votes per poll year
const pollParticipation = {
  1952: 199,
  1962: 199,
  1972: 363,
  1982: 554,
  1992: 582,
  2002: 630,
  2012: 2001,
  2022: 3817  // Most comprehensive poll
};

// Top Directors by Film Count (across all polls)
const topDirectors = {
  "Jean-Luc Godard": 43,
  "John Ford": 26,
  "Alfred Hitchcock": 25,
  "Luis Buñuel": 22,
  "Charlie Chaplin": 20,
  "Yasujirô Ozu": 19,
  "Jean-Marie Straub": 19,
  "Rainer Werner Fassbinder": 19,
  "Ernst Lubitsch": 19,
  "Martin Scorsese": 18,
  "Ingmar Bergman": 18,
  "Fritz Lang": 18,
  "D.W. Griffith": 17,
  "Jean Renoir": 17,
  "Kenji Mizoguchi": 17
};

// Top Countries by Film Count (across all polls)
const topCountries = {
  "United States": 1780,
  "France": 679,
  "United Kingdom": 457,
  "Japan": 247,
  "Italy": 245,
  "Germany": 124,
  "West Germany": 119,
  "Soviet Union": 108,
  "India": 96,
  "Canada": 72,
  "China": 72,
  "Hong Kong": 65,
  "Spain": 58,
  "Sweden": 57,
  "Austria": 51
};

// 2022 Poll Top 15 Films
const top2022Films = [
  { rank: 1, title: "Jeanne Dielman, 23, Quai du Commerce, 1080 Bruxelles", year: 1975, director: "Chantal Akerman", votes: 215 },
  { rank: 2, title: "Vertigo", year: 1958, director: "Alfred Hitchcock", votes: 208 },
  { rank: 3, title: "Citizen Kane", year: 1941, director: "Orson Welles", votes: 164 },
  { rank: 4, title: "Tokyo Story", year: 1953, director: "Yasujirô Ozu", votes: 145 },
  { rank: 5, title: "In the Mood for Love", year: 2000, director: "Wong Kar Wai", votes: 141 },
  { rank: 6, title: "2001: A Space Odyssey", year: 1969, director: "Stanley Kubrick", votes: 130 },
  { rank: 7, title: "Beau travail", year: 1999, director: "Claire Denis", votes: 106 },
  { rank: 8, title: "Mulholland Drive", year: 2001, director: "David Lynch", votes: 105 },
  { rank: 9, title: "Man With a Movie Camera", year: 1929, director: "Dziga Vertov", votes: 100 },
  { rank: 10, title: "Singin' in the Rain", year: 1952, director: "Stanley Donen, Gene Kelly", votes: 99 }
];
  "India": 90,
  "Canada": 60
};

// Top 10 Films in 2022 Poll
const top2022Films = [
  { rank: 1, title: "Jeanne Dielman, 23, Quai du Commerce, 1080 Bruxelles", votes: 215 },
  { rank: 2, title: "Vertigo", votes: 208 },
  { rank: 3, title: "Citizen Kane", votes: 164 },
  { rank: 4, title: "Tokyo Story", votes: 145 },
  { rank: 5, title: "In the Mood for Love", votes: 141 },
  { rank: 6, title: "2001: A Space Odyssey", votes: 130 },
  { rank: 7, title: "Beau travail", votes: 106 },
  { rank: 8, title: "Mulholland Drive", votes: 105 },
  { rank: 9, title: "Man With a Movie Camera", votes: 100 },
  { rank: 10, title: "Singin' in the Rain", votes: 99 }
];
```

### Processed Data Structure (for API/Frontend)
```javascript
// Country aggregation (needs to be computed from raw data)
{
  code: "USA",                     // ISO code (needs mapping)
  name: "United States",
  continent: "North America",      // Needs continent mapping
  filmsByPoll: {
    1952: 42,
    1962: 51,
    // ... computed by filtering films with votes > 0
    2022: 78
  },
  filmsByDecade: {
    1920: 12,                      // Computed from Year column
    1930: 28,
    // ... group by decade
  },
  rankBreakdown: {
    top100: 15,                    // Count films where rank <= 100
    top250: 34,                    // Count films where rank <= 250
    top500: 67,
    top1000: 128,
    all: 847                       // All films where votes > 0
  }
}

// Film detail structure
{
  key: 1,
  title: "Vertigo",
  alternateTitle: "",
  year: "1958",
  director: "Alfred Hitchcock",
  directors: ["Alfred Hitchcock"],  // Parsed from ARR_DirectorArray
  country: "United States",
  countries: ["United States"],     // Parsed from ARR_CountryArray
  pollHistory: [
    { year: 1952, rank: null, votes: 0 },
    { year: 1962, rank: 5, votes: 38 },
    // ... all 8 polls
    { year: 2022, rank: 2, votes: 208 }
  ],
  currentRank: 2,                   // 2022 rank
  currentVotes: 208,
  peakRank: 1,                      // Best rank across all polls
  appearedInPolls: 7                // Count of non-zero votes
}
```

### Data Processing Notes
```javascript
// IMPORTANT: Multiple directors handling
// ARR_DirectorArray format: "Director 1; Director 2; Director 3"
// Note: Semicolon with space separation
const directors = film.ARR_DirectorArray
  ? film.ARR_DirectorArray.split(';').map(d => d.trim())
  : [film.Director];

// IMPORTANT: Multiple countries handling
// ARR_CountryArray format: "Country 1; Country 2"
// Note: Semicolon with space separation
const countries = film.ARR_CountryArray
  ? film.ARR_CountryArray.split(';').map(c => c.trim())
  : [film.Country];

// CRITICAL: Always use .trim() when splitting to remove whitespace!

// Year handling (can be range like "1960-1964")
const yearRange = film.Year.toString().includes('-')
  ? film.Year.toString().split('-').map(y => parseInt(y))
  : [parseInt(film.Year)];

// Decade calculation for heatmaps
const getDecade = (year) => {
  const y = parseInt(year);
  return Math.floor(y / 10) * 10; // e.g., 1967 → 1960
};

// Rank filtering
const isInTop100 = (film, pollYear) => {
  const rankKey = `${pollYear}rank`;
  return film[rankKey] && !isNaN(film[rankKey]) && film[rankKey] <= 100;
};

// Vote counting
const hasVotesInPoll = (film, pollYear) => {
  const voteKey = `${pollYear}votes`;
  return film[voteKey] > 0;
};

// Country aggregation example
const getCountryFilmCount = (films, countryName, pollYear = null) => {
  return films.filter(film => {
    // Check if country appears in ARR_CountryArray
    const countries = film.ARR_CountryArray
      ? film.ARR_CountryArray.split(';').map(c => c.trim())
      : [];

    const hasCountry = countries.includes(countryName);

    // If poll year specified, check if film has votes in that poll
    if (pollYear) {
      const voteKey = `${pollYear}votes`;
      return hasCountry && film[voteKey] > 0;
    }

    return hasCountry;
  }).length;
};
```

### Data Quality Notes
**Important Considerations:**
1. **Empty strings in country data:** Some entries have empty strings - filter these out
2. **Country name variations:** "West Germany" vs "Germany", "Soviet Union" vs "Russia"
3. **Multi-country productions:** Films can have multiple countries (e.g., "United States; United Kingdom")
4. **Missing data:** Use NaN for ranks, 0 for votes when film didn't appear in poll
5. **Year ranges:** Some years are ranges (e.g., "1960-1964") - handle appropriately
6. **Director arrays:** Multiple directors separated by semicolons in ARR_DirectorArray
7. **Continent mapping:** You'll need to create a continent lookup table (country → continent)

**Recommended Data Cleaning:**
```javascript
// Filter out empty countries
const cleanCountries = countries.filter(c => c && c.trim() !== '');

// Normalize country names (optional)
const normalizeCountry = (country) => {
  const mapping = {
    'United States': 'USA',
    'United Kingdom': 'UK',
    // Add more normalizations as needed
  };
  return mapping[country] || country;
};
```

### API Endpoints (Future Implementation)
```javascript
// Country summary data
GET /api/countries/summary?poll=2022&rankRange=all
// Returns: Aggregated country data with film counts

// Decade heatmap data
GET /api/countries/decades?poll=2022&rankRange=all
// Returns: Country × Decade matrix with film counts

// Comparison data
GET /api/countries/compare?pollA=2022&pollB=2012&rankRange=all
// Returns: Side-by-side comparison with differences

// Film detail
GET /api/films/:key
// Returns: Complete film data with poll history

// Director data
GET /api/directors/:name
// Returns: All films by director with rankings
```

---

## Design Principles & Patterns

### User Experience
- **Single clear interaction patterns** over multi-modal interfaces
- Balance sophisticated functionality with clean, intuitive design
- Prioritize user experience over feature complexity
- Maintain detailed interactivity even in complex visualizations
- Mouse-over individual data points for discovery

### Visual Design
- Sophisticated, restrained design over gimmicky decorations
- Functionality enhances rather than distracts from data exploration
- Subtle film grain texture for thematic consistency
- Professional interfaces with subtle thematic elements

### Data Visualization Approach
- **Consensus patterns** (top films) require different visualizations than **diversity indicators** (single-vote films)
- Dense data clustering requires hybrid approaches (visualization + scrollable lists)
- Geographic insights show both continental patterns and country-level detail
- Temporal patterns reveal how canon formation evolved

### Interaction Design
- Two-tier tooltip system: lightweight hover for exploration + clickable popover for detail
- Avoid accidental navigation while maintaining intuitive data exploration
- Sticky filters for maintaining context while scrolling
- Auto-applying filters for immediate feedback without action buttons
- Minimal, unobtrusive filter UI that doesn't distract from visualizations

---

## Current Implementation Status

### ✅ Complete (Prototypes)
- Landing page design and layout
- Country origin main page with sticky filters layout
- Filter panel design (poll selection + rank range)
- Placeholder visualizations with specifications
- Component structure and styling patterns

### 🚧 In Progress
- Interactive country bar chart component
- Tooltip and popover interaction patterns
- Country selection interface (continent-organized, searchable)

### ⏳ Next Steps
1. Implement actual data integration (replace placeholders)
2. Build interactive map (choropleth) with D3.js
3. Create functioning bar chart with Recharts
4. Implement decade heatmap
5. Build treemap visualization
6. Add routing between pages
7. Connect to existing database
8. Create individual country detail pages

---

## Code Patterns & Conventions

### State Management
```javascript
// Use useState for component-level state
const [pollMode, setPollMode] = useState('single');
const [selectedPoll, setSelectedPoll] = useState('2022');
const [rankRange, setRankRange] = useState('all');

// Use useMemo for expensive computations
const filteredData = useMemo(() => {
  // Filter logic based on state
}, [pollMode, selectedPoll, rankRange]);

// Future: Context API or Redux for global state
```

### Component Structure
```jsx
// Prefer functional components with hooks
export default function ComponentName() {
  // Hooks at top
  // Event handlers
  // Render logic

  return (
    <div className="...">
      {/* Component JSX */}
    </div>
  );
}
```

### Styling Conventions
- Use Tailwind utility classes
- Group related utilities (layout, then spacing, then colors, then typography)
- Extract repeated patterns into reusable components
- Use `className` composition for variants

### Performance Optimization
- Memoize expensive calculations with `useMemo`
- Debounce filter changes (300ms) to avoid excessive re-renders
- Lazy load heavy chart libraries and below-fold content
- Pre-calculate common filter combinations

---

## Responsive Design

### Breakpoints
```javascript
sm: 640px   // Stack filters on mobile
md: 768px   // 2-column grids
lg: 1024px  // Sidebar appears
xl: 1280px  // Full layout
```

### Mobile Behavior
- Filters collapse into drawer/modal
- Visualizations stack vertically
- Touch targets minimum 44x44px
- Simplified navigation (hamburger menu)
- Map might switch to table view for better mobile UX

---

## Accessibility Requirements

- **Semantic HTML:** Use proper heading hierarchy, section elements
- **ARIA labels:** For complex widgets and interactive elements
- **Keyboard navigation:** All interactive elements accessible via keyboard
- **Focus indicators:** Visible focus states
- **Color contrast:** WCAG AA compliance (4.5:1 minimum)
- **Alt text:** For all meaningful images
- **Screen reader support:** Filter changes should announce

---

## Key Insights & Context

### Data Patterns to Highlight
- **USA dominance:** 1,780 films total (37% of all films), dominates North America
- **European powerhouses:** France (679 films), United Kingdom (457 films), Italy (245 films)
- **Asian cinema:** Japan (247 films), India (96 films), China (72 films), Hong Kong (65 films)
- **Historical context:** West Germany (119 films) and Soviet Union (108 films) reflect Cold War era
- **French 1960s:** New Wave era shows up strongly in decade heatmap
- **Japanese golden age:** 1950s with Kurosawa, Ozu, Mizoguchi
- **Recent growth:** Asian cinema (Korean, Chinese, Indian) growing in 2000s-2020s
- **Underrepresentation:** Africa, Latin America, Oceania minimal but growing
- **2022 shift:** Jeanne Dielman tops the poll (first time a film by a woman ranked #1)

### Top Director Patterns
- **Jean-Luc Godard leads** with 43 films across all polls
- **Classic Hollywood:** John Ford (26), Alfred Hitchcock (25), Charlie Chaplin (20)
- **European auteurs:** Buñuel (22), Bergman (18), Lang (18), Renoir (17)
- **Japanese masters:** Ozu (19), Mizoguchi (17)
- **Modern masters:** Scorsese (18), Fassbinder (19)

### Poll Evolution
- **Growing participation:** From 199 films (1952/1962) to 3,817 films (2022)
- **Expanding diversity:** More films from outside US/Europe in recent polls
- **Changing tastes:** Silent era films (1920s) now appear more than 1980s films
- **2022 expansion:** Largest poll ever, 5,455 voters vs 850 in 2012

### Analytical Distinctions
- **Top 100:** Shows consensus canon (films like Citizen Kane, Vertigo, Tokyo Story)
- **Top 10 stability:** Core masterpieces appear across multiple polls
- **Single-vote films:** Shows diversity of taste (over 2,000 films with only 1 vote in 2022)
- **Rank mobility:** Films move up and down significantly between polls
- **Different visualization strategies needed for consensus vs. diversity**
- Compare mode should show changes/differences clearly

### Metrics: Poll Appearances vs. Distinct Films

**PRIMARY METRIC: Poll Appearances**

For the Country Origin visualizations, we use **poll appearances** as the primary metric, not distinct film counts.

**Why Poll Appearances:**
- Captures canonical weight and persistence across time
- Shows which countries have sustained critical consensus
- Works perfectly with filter logic (single poll = that poll's rankings, all polls = accumulated weight)
- More analytically rich: reveals which countries "punch above their weight" with repeated appearances

**Language Guidelines:**

When **"All Polls Combined"** is selected:
- Use "poll appearances" or "times ranked" in labels
- Info banner: "Showing 117 countries across 3,817 poll appearances"
- Bar chart axis: "Times Ranked" or "Poll Appearances"
- Tooltips: "French films have been ranked 890 times across all polls"

When **single poll** is selected (e.g., "2022 Poll"):
- Use "films" in labels (clearer for single poll context)
- Info banner: "Showing 117 countries across 3,817 films (2022 Poll)"
- Bar chart axis: "Number of Films"
- Tooltips: "France: 85 films in 2022 poll"

**Key Distinction:**
- **Poll appearances** = how many times films appear across poll(s) - measures canonical persistence
- **Distinct films** = unique film count - measures breadth of contribution

**Example:**
- France might have 350 unique films but 890 poll appearances
- This tells us French films appear an average of 2.5 times per film
- Shows deep canonical persistence vs. one-time appearances

**Optional Enhancement (Future):**
In detailed views, show both metrics: "890 poll appearances (from 350 unique films)"

---

## Testing Priorities

### Critical Paths to Test
- Filter changes update all visualizations correctly
- Single poll vs Compare mode behaves differently
- Rank range filtering works across all views
- Click interactions navigate to correct pages
- Mobile responsive behavior works
- Accessibility features function properly

### Performance Targets
- Page load: <3 seconds
- Filter application: <500ms
- Lighthouse score: >90 for all metrics
- Time to interactive: <5 seconds

---

## Future Features (V2+)

### Phase 2
- Individual country detail pages
- Film rank progression visualizations
- Director-focused pages
- Timeline visualizations

### Phase 3
- User authentication and profiles
- Saved filter combinations
- Custom lists and collections
- Export/share functionality
- Blog CMS integration
- Compare personal lists to canon

---

## Working with This Project

### When Starting a New Task
1. Read this CLAUDE.md for overall context
2. Reference specific documentation files for detailed specs
3. Look at prototype JSX files for structure examples
4. Follow established design system and component patterns
5. Maintain accessibility and responsive design standards

### File Organization
- Keep components modular and reusable
- Extract repeated UI patterns into shared components
- Document complex logic with comments
- Use meaningful variable and function names
- Follow the established naming conventions

### Communication Style in Code
- Clear, descriptive variable names (e.g., `filteredCountryData` not `data`)
- Document non-obvious logic with comments
- Use TypeScript types or JSDoc comments for clarity
- Keep functions focused and single-purpose

---

## Questions or Unclear Areas?

If you encounter something not covered in this guide:
1. Check the detailed documentation files (LANDING_PAGE_DOCUMENTATION.md, COUNTRY_ORIGIN_PAGE_DOCUMENTATION.md, SITE_ARCHITECTURE.md)
2. Look at the prototype JSX files for implementation examples
3. Ask clarifying questions before proceeding with assumptions

---

## Quick Reference: Common Tasks

### Adding a new visualization
1. Create placeholder component
2. Define data requirements
3. Implement with appropriate library (Recharts/D3)
4. Add interactions (hover, click)
5. Ensure responsive behavior
6. Test accessibility

### Creating a new filter
1. Add to filter state
2. Update filter UI in sidebar
3. Implement filter logic in data processing
4. Update filter summary box
5. Test filter combinations

### Building a new page
1. Follow routing structure from SITE_ARCHITECTURE.md
2. Include Header and Footer components
3. Follow page layout patterns (hero, sections, footer)
4. Implement responsive breakpoints
5. Add to navigation menu

### Working with the Data
```javascript
// Load the main data (use "main data" sheet)
const films = loadExcelSheet('sight_and_sound.xlsx', 'main data');

// Get films for a specific poll
const films2022 = films.filter(f => f['2022votes'] > 0);

// Parse multiple countries
const countries = film.ARR_CountryArray
  .split(';')
  .map(c => c.trim())
  .filter(c => c !== '');

// Count films by country in a poll
const getCountryCount = (countryName, pollYear) => {
  return films.filter(film => {
    const countries = film.ARR_CountryArray
      .split(';')
      .map(c => c.trim());
    const hasCountry = countries.includes(countryName);
    const hasVotes = film[`${pollYear}votes`] > 0;
    return hasCountry && hasVotes;
  }).length;
};

// Get top N countries for a poll
const getTopCountries = (pollYear, n = 10) => {
  const countryCounts = new Map();
  films.forEach(film => {
    if (film[`${pollYear}votes`] > 0) {
      const countries = film.ARR_CountryArray
        .split(';')
        .map(c => c.trim())
        .filter(c => c !== '');
      countries.forEach(country => {
        countryCounts.set(
          country,
          (countryCounts.get(country) || 0) + 1
        );
      });
    }
  });
  return Array.from(countryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
};
```

---

## TL;DR - Quick Start for Claude Code

**What is this?** A data visualization website for Sight & Sound's Greatest Films polls (1952-2022)

**Data Source:** Excel file `sight_and_sound.xlsx` - use "main data" sheet (4,851 films × 26 columns)

**Key Data Columns:**
- `FilmTitle`, `Year`, `Director`, `ARR_DirectorArray` (semicolon-separated)
- `Country`, `ARR_CountryArray` (semicolon-separated - THIS IS CRITICAL!)
- `2022rank`, `2022votes` (and similar for all 8 poll years)

**Current Focus:** Building country visualization page (`/visualizations/country`) with:
- Sticky filter sidebar (poll selection + rank range)
- 6 visualizations: world map, bar chart, heatmap, treemap, stats, insights

**Tech Stack:** React + Tailwind CSS + Recharts + D3.js

**Top Countries:** USA (1,780), France (679), UK (457), Japan (247), Italy (245)

**Top 2022 Film:** Jeanne Dielman (215 votes) - first time a woman's film ranked #1

**Design Philosophy:** Clean, Criterion Collection-inspired, sophisticated without being gimmicky

**Critical:** Always split ARR_CountryArray and ARR_DirectorArray by `;` and `.trim()` each item!

---

**Last Updated:** November 2025
**Project Status:** Active Development - MVP Phase
**Data File:** sight_and_sound.xlsx (included in repository)
