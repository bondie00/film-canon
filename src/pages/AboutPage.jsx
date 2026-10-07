import { Link } from 'react-router-dom'
import ProsePage, { ProseSection, Draft } from '../components/layout/ProsePage'

const linkClass = 'font-bold text-black underline underline-offset-4 hover:no-underline'

// Kept short on purpose: what the site is, why, and where the data comes from.
// The detail on how the data was built lives on /methodology.
export default function AboutPage() {
  return (
    <ProsePage
      title="About"
      lede="Every ten years since 1952, Sight & Sound has asked critics to name the greatest films ever made. Cinema Canon collects every poll, every ballot, and every film that got a vote."
    >
      <ProseSection id="poll" title="The poll">
        <p>
          Sight &amp; Sound is a prominent film magazine, published by the British Film Institute
          since the 1930s. In 1952 it asked a group of critics to name the ten best films ever
          made, and it has repeated the question every ten years since. Today the Sight &amp; Sound
          Greatest Films of All Time poll is widely regarded as the most influential poll of its
          kind.
        </p>
        <p>
          The voters are selected by the BFI and are mostly film critics, journalists,
          programmers, archivists and academics. Each submits a ballot of ten films, unranked.
          Every film on a ballot gets one vote, and the results are sorted by number of votes. The
          voter pool has grown from fewer than 100 participants in 1952 to more than 1,600 in
          2022.
        </p>
      </ProseSection>

      <ProseSection id="why" title="Why this exists">
        <p>
          In 2022, <em>Jeanne Dielman, 23, Quai du Commerce, 1080 Bruxelles</em> became the new
          number one in the Sight &amp; Sound poll, and I wanted to know how it got there. Its 2012
          rank was easy to find: Sight &amp; Sound publishes that top 100, and the film sits at
          number 36. Before that, the trail goes cold. For every poll from 1952 to 2002, only the
          top ten is published. Did anyone vote for <em>Jeanne Dielman</em> in 2002, or before?
          There was no way to find out.
        </p>
        <p>
          The answer turned out to be yes. Three critics named it in 1992 and four in 2002, which
          put it at number 93 and then number 62. Thirty years of its climb were sitting in the
          ballots, unpublished. The same was true of every other film that had ever been voted
          for. The top ten tells you what won. The full count tells you how taste moved.
        </p>
        <p>
          So I gathered every ballot from every poll, matched the films across seventy years of
          changing titles and spellings, and built this site to read the results.{' '}
          <Link to="/film/1748" className={linkClass}>
            Here is <em>Jeanne Dielman</em>'s page
          </Link>
          , with the whole climb on it.
        </p>
      </ProseSection>

      <ProseSection id="data" title="The data">
        <p>
          The ballots exist. Sight &amp; Sound has published the full list of voters and their
          choices for every poll, but as eight separate sets of lists, each in its own format, and
          never joined up. Putting them together was the bulk of the work.
        </p>
        <p>
          The first job was deciding when two ballots named the same film. Across seventy years
          the same title turns up in its original language and in several English ones, with
          different spellings of its director and sometimes a different year. Every film was
          matched by hand and given one main title, with the others kept as alternates so a search
          finds it under any of them. The result is 4,851 films, every one that has received at
          least one vote since 1952, each with its rank and vote count in every poll.
        </p>
        <p>
          Each film then needed a consistent set of facts to sort and filter by: a release year,
          its directors, its country or countries of production, and its genres. None of these is
          as simple as it looks. Co-productions have several countries, films from the Soviet
          Union and West Germany belong to states that no longer exist, and genre is a judgement
          call that was made film by film. The rules I settled on are written up on the
          methodology page, so you can check any number against them.
        </p>
        <p>
          <Link to="/methodology" className={linkClass}>
            How the data was built →
          </Link>
        </p>
      </ProseSection>

      <ProseSection id="what" title="What you can do here">
        <p>
          Every film that received at least one vote in any poll has a page, with its rank and vote
          count in each poll it appeared in. Every critic and filmmaker who voted has a page with
          their ballots. You can browse any poll in full, from the winners down to the films that
          a single person picked, and filter by poll, rank, year, country, director and genre.
        </p>
        <p>
          More is coming: pages on the countries, directors, decades and genres the canon is made
          of, and how each one's share has risen or fallen from poll to poll.
        </p>
      </ProseSection>

      <ProseSection id="who" title="Who made it">
        <p>
          Cinema Canon began as my master's thesis for the Data Analysis and Visualization program
          at the CUNY Graduate Center, and has kept growing since.
        </p>
        <Draft>Your name, and an email or social link if you decide to offer one.</Draft>
      </ProseSection>

      <ProseSection id="credits" title="Credits">
        <p>
          The polls are the work of Sight &amp; Sound and the British Film Institute, and of the
          thousands of critics, programmers and filmmakers who voted in them. Cinema Canon is an
          independent project and is not affiliated with either.
        </p>
        <p>
          Posters and stills come from MUBI and from The Movie Database. This product uses the TMDB
          API but is not endorsed or certified by TMDB.
        </p>
        <Draft>TMDB logo, required by their attribution terms before public launch.</Draft>
      </ProseSection>
    </ProsePage>
  )
}
