import ProsePage, { ProseSection, Draft } from '../components/layout/ProsePage'

// The reference page for anyone who wants to check a number: how the data was
// gathered and every judgement call made in cleaning it.
export default function MethodologyPage() {
  return (
    <ProsePage
      title="Methodology"
      lede="How the data behind Cinema Canon was gathered, cleaned, and classified, and the decisions made along the way."
    >
      <ProseSection id="collection" title="Collecting the data">
        <Draft>Sources for the polls and ballots, and how they were gathered.</Draft>
      </ProseSection>

      <ProseSection id="titles" title="Film titles">
        <Draft>
          Which title is the main one, how alternate titles are kept, and that search matches all of
          them.
        </Draft>
      </ProseSection>

      <ProseSection id="directors" title="Director names">
        <Draft>Spelling and transliteration (e.g. Yasujirô Ozu), and co-directed films.</Draft>
      </ProseSection>

      <ProseSection id="countries" title="Countries">
        <Draft>
          The rules for assigning countries: co-productions, defunct states (West Germany, the
          Soviet Union and its republics), and the edge cases.
        </Draft>
      </ProseSection>

      <ProseSection id="genres" title="Genres">
        <Draft>
          What each tag means (e.g. Fantasy as premise, Avant-Garde as form), and which tags are
          judged film by film.
        </Draft>
      </ProseSection>

      <ProseSection id="ranks" title="Ranks, ties and rank depth">
        <Draft>
          How ranks and ties work, the vote floor, and why the rank depth control counts films
          rather than ranks.
        </Draft>
      </ProseSection>

      <ProseSection id="gaps" title="Known gaps">
        <Draft>What is missing or uncertain in the data.</Draft>
      </ProseSection>
    </ProsePage>
  )
}
