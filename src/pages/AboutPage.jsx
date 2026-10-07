import { Link } from 'react-router-dom'
import ProsePage, { ProseSection, Draft } from '../components/layout/ProsePage'

// Kept short on purpose: what the site is, why, and where the data comes from.
// The detail on how the data was built lives on /methodology.
export default function AboutPage() {
  return (
    <ProsePage
      title="About"
      lede="Every ten years since 1952, Sight & Sound has asked critics to name the greatest films ever made. Cinema Canon collects every poll, every ballot, and every film that got a vote."
    >
      <ProseSection id="why" title="Why this exists">
        <Draft>
          The gap you saw — Sight &amp; Sound publishes the top 100, but the long tail and the
          history across polls are scattered or missing.
        </Draft>
      </ProseSection>

      <ProseSection id="what" title="What you can do here">
        <Draft>
          The goals of the site: browsing the polls, film and voter pages, and the visualizations
          still to come.
        </Draft>
      </ProseSection>

      <ProseSection id="data" title="The data">
        <Draft>
          One paragraph: where the data comes from, and that titles, directors, countries and
          genres were standardised by hand.
        </Draft>
        <p>
          <Link to="/methodology" className="font-bold text-black underline underline-offset-4 hover:no-underline">
            How the data was built →
          </Link>
        </p>
      </ProseSection>

      <ProseSection id="who" title="Who made it">
        <Draft>Who you are, and how to get in touch.</Draft>
      </ProseSection>

      <ProseSection id="credits" title="Credits">
        <Draft>
          Sight &amp; Sound / BFI for the polls. TMDB, with their logo and the line "This product
          uses the TMDB API but is not endorsed or certified by TMDB." — required before public
          launch. MUBI, if its images are used.
        </Draft>
      </ProseSection>
    </ProsePage>
  )
}
