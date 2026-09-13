import FilterCard, { FilterSection } from '../filters/FilterCard'
import PollGrid from '../filters/PollGrid'

/**
 * Control rail for the director page, on the same FilterCard every other rail
 * uses. It had its own copy of the shell and of the poll grid, a size smaller
 * than the rest, until the rails were made to behave the same everywhere.
 *
 * Only controls that drive the WHOLE page belong here. Sort order lives on the
 * filmography itself, since it reorders that grid and nothing else.
 *
 * CONTROLS ONLY — no readout. What the poll currently selects is counted in the
 * page header, which responds to this control.
 *
 * Polls the director missed are rendered disabled rather than hidden, so the
 * gaps in a career are visible in the control itself.
 */
export default function DirectorFilterPanel({ poll, onPollChange, counts }) {
  return (
    <FilterCard>
      <FilterSection label="Poll Selection" first>
        <PollGrid value={poll} onChange={onPollChange} counts={counts} />
      </FilterSection>
    </FilterCard>
  )
}
