# Quizlycs Rulebook

**Status:** Draft v1\
**Last updated:** 10 August 2026

## 1. Core rule

A `song_match` must represent a defensible relationship between **song +
actual lyric text + theme + canonical concept**.

The Assistant must not create a match merely because a word can
theoretically be interpreted as something in the theme.

## 2. Evidence must occur in lyrics

The relevant word/expression must actually occur in supplied lyrics.

Do not infer a match only from title or artist name, invent lyric
occurrences, or paraphrase `matched_text`.

Established example: Nirvana --- *Lithium*: the title alone is not lyric
evidence.

## 3. Precision over recall

Catalogue quality is more important than maximum suggestions. If
uncertain whether the lyric genuinely refers to the intended concept,
omit it. `suggestions: []` is a good result.

## 4. Exact-match / no-free-association

Normal approved translations, synonyms and linguistic forms may be
recognised, but generic words must not become obscure proper nouns just
because such an entity exists.

Examples of bad inference: - `baby` → an artist named Baby - `Discovery`
→ the band Discovery - `mammals` → The Mammals

Context must support the intended entity.

## 5. Ambiguous proper nouns

Words such as Prince, Queen and Kiss can also be ordinary words. Lexical
equality alone is insufficient when the lyric clearly uses the ordinary
meaning. `is_proper_noun` and `concept_class` should help enforce this.

## 6. Existing concepts first

Reuse an existing canonical `concept_id` whenever it fits. Do not create
spelling/casing variants of existing concepts.

New concepts should require genuine lyric evidence, no existing
equivalent, canonical ID conventions and human approval until the
workflow is proven safe.

## 7. Concept classes

`concept_class` describes what a concept is. Examples discussed/used: -
person - band - planet - fictional_planet - body_part - color -
instrument - tree

The controlled vocabulary should be centralised and audited.

Theme → allowed classes is domain logic. Example: **Artister** may
accept person and band. AI must not silently redefine this mapping.

## 8. Labels and languages

Canonical identity and display labels are separate: - `id` -
`label_no` - `label_en` - `is_proper_noun` - `concept_class`

Initial target languages: Norwegian, Swedish, Danish, English, German
and Spanish. Proper nouns generally retain their name.

## 9. Translation and synonyms

Approved translations/synonyms can represent the same concept when
quiz-language rules permit. Example: `Moon` / `Måne`.

Do not confuse approved translation or inflection with loose semantic
association.

## 10. Multiple matches

A song may contain multiple valid concepts within one theme and across
themes. Never force one song → one match.

## 11. Duplicates

Do not create duplicate matches because AI proposed the same concept
twice, capitalization differs, or a review item was processed twice.

## 12. Confidence

Confidence is a review aid, not proof.

Provisional thresholds: - 95--100%: strong explicit evidence. - 70--94%:
human review. - Below 70%: normally suppress from primary review UI.

Calibrate later using real reviewed data.

## 13. Assistant behaviour

Assistant should: - inspect supplied lyric evidence; - use supplied
theme/rules; - prefer existing concepts; - return structured data; -
briefly explain ambiguity; - return no suggestion when evidence is weak.

Assistant should not: - hallucinate lyrics; - use title as lyric
evidence; - turn common words into speculative entities; - create a new
concept when a canonical one exists; - silently approve database
changes.

## 14. Review workflow

Known states: - `to_review` - `approved` - `rejected` - `skipped`

Reviewed work should receive appropriate timestamps. Approved rows
require canonical concept and matched lyric text.

## 15. Answer bubbles

Wrong answers should be plausible but unambiguously wrong: - same
theme; - same question language; - similar difficulty where possible.

Avoid duplicate labels, synonyms of the correct answer, another label
for the same concept, category mismatch and accidental mixed languages.

Each player gets one attempt. Feedback is immediate.

## 16. Regression examples

Useful examples from project decisions: - Weird Al Yankovic --- *Yoda /
The Saga Begins*: fictional planets. - Red Hot Chili Peppers ---
*Californication*: location/planet-related concepts discussed. - Shania
Twain --- *That Don't Impress Me Much*: Brad Pitt. - Miley Cyrus ---
*Party in the U.S.A.*: Britney Spears and USA across themes. - Norwegian
lyrics may explicitly name Dr. Dre, Eminem, Tommy Lee and Tom Green. -
`crack` is an example of an explicit lyric concept. - `Lithium` is the
warning that a song title is not sufficient evidence.

These should eventually become automated regression fixtures.

## 17. Open questions

-   Final controlled `concept_class` list.
-   Permanent semantics/name for Artister.
-   Capitalisation rules for proper-noun ambiguity.
-   Formal synonym/translation storage.
-   Theme-specific confidence thresholds.
-   Partial names, nicknames and stage names.
-   Plural/singular and inflections across languages.
-   Real vs fictional concepts.
-   Distractor difficulty scoring.

## 18. Rule-change process

When a recurring edge case is decided: 1. Add the rule here. 2. Add
examples. 3. Update Assistant prompt/validation. 4. Add audit/regression
test where practical.
