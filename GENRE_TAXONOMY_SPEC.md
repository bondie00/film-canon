# Genre Taxonomy Spec — the Drama strip and the Docufiction split

**Status:** decisions closed 2026-08-24. Ready to build the strip script and emit the
review CSV. **Nothing written to the workbook until that CSV is signed off.**
**Date:** 2026-08-24
**Touches:** `data/sight and sound data new.xlsx` (Genre column), `scripts/genre_vocab.py`,
new `scripts/strip_redundant_drama.py`. Regenerates `public/data/films.json`.

---

## 1. The problem

`Drama` is on 2,971 of 4,842 films — **61.4%**. A tag that covers three fifths of the
corpus cannot discriminate, so it cannot be ranked, filtered or charted usefully.
`genre-page-plan` recorded this as a hard constraint on the genre page: *"Drama is a
default, not a category. Near-zero discriminating power, so DON'T organise the page by
raw size."*

Worse, it isn't even applied consistently. The corpus currently claims a distinction it
does not actually draw:

| tagged `X` | tagged `X, Drama` |
|---|---|
| Unforgiven | Shane |
| Arrival | Gattaca |
| Nausicaä of the Valley of the Wind | Bambi |
| Suspiria | Possession |
| Marnie | Spider |

There is no principle separating those columns. They are the residue of different
tagging sessions. Whatever information `Drama` appears to add to a genre film is noise.

## 2. The definition

> **Drama** = serious narrative fiction with no other defining genre.

Two deliberate co-listings survive, because in each the tag marks an *exception to that
genre's default tone* rather than restating it:

- **`Comedy` + `Drama`** — the dramedy. Validated: `Comedy` alone is *Fast Times at
  Ridgemont High*, the Léontine shorts, *Smoking/No Smoking*; `Comedy, Drama` is
  *Certified Copy*, *Le Havre*, *The Match Factory Girl*, *Bed and Sofa*. Broad comedy
  vs melancholy comedy — a real line, consistently drawn.
- **`Avant-Garde` + `Drama`** — narrative art film. `Avant-Garde` alone is *Wavelength*,
  *Black TV*, *Chelsea Girls* (non-narrative); `Avant-Garde, Drama` is *Jeanne Dielman*,
  *Syndromes and a Century*, *Trans-Europ-Express* (narrative). Avant-Garde is the one
  genre whose default is **not** dramatic, so here `Drama` marks the exception in the
  same way `Comedy` does everywhere else.

## 3. Which tags displace Drama

The test is **does this tag identify a FORM?** — does it answer "what kind of film is
this?" A tag that names only a subject, an audience or a reception does not, and
stripping `Drama` on its authority leaves the film worse described.

### DISPLACE — strip `Drama` when present

```
Sci-Fi · Western · Thriller · Crime · Action & Adventure · Fantasy · Horror
Documentary · War · History & Biography
```

War, History and Biography are here by decision, against the recommendation in §6 —
read that section before changing this list.

Each is default-dramatic, with `Comedy` as the marked exception. The `Comedy%` column
is the evidence — the share of each genre's films that are also comedies:

```
Film noir  1%    Mystery   6%    Crime      14%    Sci-Fi     23%
Western    5%    Thriller  7%    Horror     13%    Adventure  23%
History    5%    Biography 9%    Action     13%    Fantasy    23%
                                 Musical    43%    Romance    29%
```

Musical 43% and Romance 29% sit well above the rest, and Mystery's 6% understates how
often it's the shape of a drama rather than a genre — which is why those three were
taken off this list and are judged per film (below).

### JUDGED PER FILM — `Mystery`, `Musical`, `Romance`

These three were on the DISPLACE list in the first draft of this spec and came off it
in the hand-review passes (see `scripts/genre_vocab.py`, which is the rule in force).
They co-list with `Drama` far more often than the DISPLACE genres do — 20%, 9% and 55%
of their films — because each can be the film's *form* or merely its *subject*, and
only the form reading displaces:

- **Mystery.** *Citizen Kane*, *L'avventura*, *Blow-Up*, *The Headless Woman* keep
  `Drama`: the mystery is the shape of a serious narrative, not a genre engine.
  *Chinatown*, *Memories of Murder*, *Zodiac* lose it — but to `Crime` and `Thriller`
  beside them, not to `Mystery`. Measured 2026-09-16: of 41 Mystery films with no other
  displacing tag, 33 keep `Drama`, 7 never had it (comedies and puzzle films), and one
  (*Ten Minutes to Live*) is the whole difference between this rule and KEEP.
- **Romance.** `Romance` is a form only when the love story is the film's spine (*In the
  Mood for Love*, *L'Atalante*, *Brief Encounter*). A film that *contains* obsessive love
  is not a romance: *Vertigo* carried `Romance` and lost it 2026-09-16, because its spine
  is the mystery, and it was surfacing as the top-ranked Romance in the poll, which is
  what exposed the tag as a subject reading.
- **Musical.** `Musical` alone reads as dramatic and `Musical, Comedy` as the comic one
  (the Sci-Fi convention); `Drama` is kept only where the seriousness is the point.

### KEEP — `Drama` survives alongside these

```
Comedy · Avant-Garde       (see §2 — they mark exceptions, not restatements)
Cult · Family              (reception and target audience, not content)
LGBTQ+ · Sport · Music · Erotica   (subject matter)
Animation                  (a MEDIUM, like Silent — an animated film can be any genre)
```

This list is what keeps films from being described by subject alone. With War, History
and Biography moved to DISPLACE (§6), **224 films still land in that state** — the ones
below on the left are now accepted consequences, the ones on the right are prevented:

```
ACCEPTED (via §6)                      PREVENTED (by this list)
All the President's Men -> Biography   Easy Rider              -> Cult, Drama
Timbuktu                -> War         Million Dollar Baby     -> Sport, Drama
The Trial of the Chicago 7 -> History  How Green Was My Valley -> Family, Drama
                                       Penda's Fen             -> LGBTQ+, Drama
```

`Cult` and `Family` have **0 films** standing alone anywhere in the corpus — they never
stand on their own because they cannot. `Animation` pairs with `Drama` only 5 times but
with other genres 79 times, which is what a medium looks like, not a genre.

## 4. The Docufiction split

`Drama` + `Documentary` is 39 films, and it is the **most precise pair in the dataset** —
not sloppy tagging. It marks staged documentary and essay film:

> Close-Up · People on Sunday · Nanook of the North · Man of Aran · F for Fake ·
> The Blair Witch Project · Mysterious Object at Noon · Histoire(s) du cinéma ·
> The Image Book · Far from Vietnam · Riddles of the Sphinx · Come Back, Africa ·
> ¡Que viva México! · Trás-os-Montes · Germany in Autumn · Salaam Cinema ·
> One Way or Another · Ten · Tongpan

Deleting `Drama` from these destroys a real distinction; keeping it violates §2. So
**name the thing instead**:

1. Add `Docufiction` to `GENRE_TAGS`.
2. Move the ~27 genuine hybrids above to `Docufiction`, dropping both `Drama` and
   keeping `Documentary`.
3. Strip `Drama` from the ~10 that are straight documentaries which picked the tag up
   loosely: *Hoop Dreams*, *Anvil! The Story of Anvil*, *Unrest*, *Touching the Void*,
   *Voices Through Time*, *The Blonds*, *Blues Under the Skin*, *Atlantic Rhapsody*,
   *Closes*, *The Quince Tree Sun*.

The 27/10 split is a judgement call per film and ships in the review CSV for sign-off,
not as a mechanical rule.

## 5. What it costs

```
films losing Drama        1,617
Drama                     2,971 -> 1,354   (61.4% -> 28.0% of corpus)
films orphaned                0     HARD ASSERT: no film loses its last genre tag
films left subject-only     224     accepted consequence of §6, not a failure
genre tags per film        1.97 -> 1.64
Docufiction                   0 -> ~27
```

The 987 pure-residual Dramas — films where `Drama` is already the only genre tag — are
untouched. The strip only moves films that had somewhere else to go.

**The payoff.** The genre chart stops being one bar and rubble:

```
BEFORE                              AFTER
Drama       61.4%  ####################   Drama       28.0%  ########
Comedy      18.7%  ######                 Comedy      18.7%  ######
Romance     14.8%  ####                   Romance     14.8%  ####
Documentary 13.2%  ###                    Documentary 13.2%  ###
   3.3x the second bar                       1.5x the second bar
```

This **retires the `genre-page-plan` constraint** against organising the page by raw
size. Size ordering becomes legible, instead of movement-across-polls being forced on
us as a workaround.

## 6. DECIDED — War, History, Biography: DISPLACE (option B)

These three behave identically to each other (Drama% 81/81/84, Comedy% 11/5/9) and must
be decided together. They are the last lever.

| | Drama lands | subject-only films | example |
|---|---|---|---|
| **A** — keep Drama (recommended) | **1,616 (33.4%)** | 0 | `Timbuktu` -> `War, Drama` |
| **B** — displace Drama | 1,354 (28.0%) | **224** | `Timbuktu` -> `War` |

Arguments for **B**: "war film" and "biopic" are recognised genres that do identify a
form, and B gives the cleaner chart.

Arguments for **A**: these tags read as subjects attached to a drama, not as the film's
form. *All the President's Men* recorded as `Biography` alone is a worse record than
`Biography, Drama`. A also keeps the subject-only count at zero, which is the guarantee
that makes the whole policy safe.

**DECIDED: B.** War, History and Biography displace Drama. Recorded honestly: the
recommendation above was A, and B was chosen against it after the 224-film consequence
was stated twice. It is a one-line change to `DISPLACE` if the review CSV changes the
picture.

`DISPLACE` therefore reads:

```
Sci-Fi · Western · Thriller · Crime · Action & Adventure · Fantasy · Horror
Documentary · War · History & Biography
```

and the §5 figures become: **strip 1,617 · Drama 2,971 -> 1,354 (28.0%) · orphans 0 ·
subject-only 224**.

## 7. Out of scope — recorded, not done

- **Over-tagging.** Not systematic: 93% of films carry ≤3 genre tags, and the strip
  removes one from 1,355 of them. The residue is the `Crime/Thriller/Mystery/Film noir`
  bleed (*Chinatown*, *The Long Goodbye*) and stray weak tags (*Apocalypse Now* tagged
  `Mystery`). No structural rule applies — needs per-film judgement. Tractable scope:
  the **78 films with 5+ genre tags**.
- **The Avant-Garde boundary** — audited 2026-09-16 as pass 10 (`scripts/build_pass10_review.py`,
  three CSVs). Avant-Garde is a genre of FORM, Fantasy a genre of PREMISE; the docstring
  states both tests and the outer-boundary decisions (surrealist narratives, slow cinema,
  realist art cinema, essay films all IN; straight documentaries OUT). 32 films changed.
- **78 format-only films** (53 tagged just `Short`) remain invisible to any GENRE_TAGS
  ranking. Pre-existing; unchanged by this work.

## 8. Implementation

1. `scripts/genre_vocab.py` — add `Docufiction` to `GENRE_TAGS`; document the two-axis
   note with the new Drama definition from §2.
2. `scripts/strip_redundant_drama.py` — new. Holds `DISPLACE` and `KEEP` as explicit
   frozensets, refuses to run if they do not partition `GENRE_TAGS`, and **asserts zero
   orphans and zero subject-only films before saving**. Writes only the Genre column.
3. Emit `data/drama_strip_review.csv` — every changed row, before -> after, plus the
   39 Docufiction candidates flagged `hybrid` / `straight-doc` for correction. **Review
   gate: no workbook write until this is signed off.**
4. Back up the workbook to the scratchpad first, as with `fill_blank_genres.py`.
5. **DECIDED: preserve pre-strip values in the sheet.** Add a `Genre_pre2026` column
   holding the current Genre string verbatim for every changed row, written in the same
   pass. The sheet has unused columns past 32, so this is additive and `convert-data.py`
   reads by header name and will ignore it. The review CSV carries the same before ->
   after record as a second copy.
6. `python scripts/convert-data.py && python scripts/merge_tmdb_images.py`
   (the second is REQUIRED or tmdbId and both image paths are wiped for 4,722 films).
7. Re-run the §5 assertions against the regenerated `films.json`.
