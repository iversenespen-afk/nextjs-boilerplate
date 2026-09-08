# Quizlycs Roadmap

**Status:** Working roadmap\
**Last updated:** 8 September 2026

## Product vision

Quizlycs is a multiplayer music/lyrics quiz. A host starts a quiz,
players join with a room code, Spotify plays the relevant song, and
players answer by tapping compact rounded bubbles. Each player gets one
attempt per question. The host/admin should also be able to participate.

Long-term content target: a large quality-controlled catalogue,
initially around 10,000 songs, with multiple valid lyric/concept matches
per song.

## Completed / working foundation

-   Next.js App Router app on Vercel.
-   Supabase database.
-   Core data: themes, concepts, songs, song_matches and review queue.
-   Password-protected admin review.
-   Spotify IDs stored for songs.
-   Audits for concepts, songs, song matches and review queue, plus
    combined audit runner and GitHub Actions.
-   Quizlycs Assistant UI.
-   Fetch next review item.
-   OpenAI Responses API with structured JSON output.
-   AI suggestions displayed in Assistant.
-   Concept lookup API.
-   Lyrics-provider abstraction; currently mock lyrics.

## Current focus --- Assistant MVP

Goal: take one queued song from AI analysis to a human-approved
`song_match`.

Next: - Conservative Quizlycs-aware prompt. - Clear suggestion cards
with matched text, confidence, existing/new concept and explanation. -
Approve / Reject. - Approval writes correct `song_match`. - Update
review queue state/timestamps. - Automatically fetch next item. -
Prevent duplicate matches. - Error handling and audit coverage.

## Phase 2 --- Concepts and themes

-   Finalise `concept_class`.
-   Finalise `is_proper_noun`.
-   Maintain `label_no` / `label_en`.
-   Central theme → allowed concept-class rules.
-   Resolve artist/person/band semantics.
-   Formalise synonyms and translations.
-   Consistent handling of ambiguous words such as Prince, Queen and
    Kiss.

## Phase 3 --- Production lyrics

-   Select licensed lyrics provider.
-   Review storage and third-party AI rights.
-   Replace mock provider without changing Assistant architecture.
-   Avoid unnecessary full-lyrics storage.
-   Handle rate limits/provider failures.

## Phase 4 --- Scale import pipeline

-   Larger Spotify-derived imports.
-   Spotify ID as stable identity.
-   Deduplicate songs and matches.
-   Automatically create review work.
-   Multiple matches per song.
-   Process hundreds/thousands through Assistant.
-   Work toward \~10,000 quality-controlled songs.

## Phase 5 --- Core multiplayer game

Host creates quiz → room code → players join → Spotify/question starts →
answer bubbles → one answer per player → feedback → scoring → next
question → leaderboard.

Build: - Host/session model. - Join code. - Participants. - Realtime
state. - One-answer enforcement. - Scoring/progression/leaderboard. -
Host/admin can participate.

## Phase 6 --- Bubble answer engine

-   Compact rounded bubble rectangles.
-   Responsive mobile layout.
-   Correct answer plus plausible same-theme distractors.
-   Language-consistent labels.
-   Immediate green/red feedback.
-   Automatic progression.

## Phase 7 --- Music playback

Spotify playback is a product dependency, but Quizlycs must not depend on an
unauthorised Spotify API integration. Current Spotify developer policy does
not permit standard API use for games/trivia. Playback therefore follows a
two-stage strategy.

### Plan A --- Playlist-based MVP (no Spotify API)

Goal: launch and validate Quizlycs without using Spotify API/OAuth/playback
SDK.

- Create a large set of pre-curated Spotify playlists corresponding to
  Quizlycs quiz sets (potentially 600--700 playlists as the catalogue grows).
- Each playlist contains the quiz songs in exactly the same order as the
  questions.
- Host opens the relevant playlist in the normal Spotify app and initiates
  playback.
- Quizlycs handles quiz state, questions, answer bubbles, scoring and
  leaderboard separately; Quizlycs does not control Spotify playback through
  the API.
- Design host-side synchronization so the quiz remains robust to pauses,
  skips, unavailable tracks, shuffle/crossfade and user error.
- Use Plan A to ship an MVP, test real gameplay, establish usage metrics and
  demonstrate product-market fit without waiting for Spotify approval.
- Keep Spotify IDs as song identity/metadata where useful; avoiding playback
  API does not require removing them from the catalogue.

Plan A is an MVP/validation route, not assumed to be a legal workaround for
all use cases. Public/commercial venue playback (pubs, events, businesses)
requires separate rights/commercial-use assessment.

### Plan B --- Approved Spotify integration / partnership

Goal: replace the playlist handoff with seamless host-controlled playback
when Quizlycs has enough product maturity and traction to approach Spotify.

- Seek explicit written approval/commercial partnership for music-trivia
  playback, analogous in user experience to Hitster.
- Prepare a partner case based on a working product, real users, sessions,
  retention/usage and evidence that Quizlycs drives legitimate Spotify
  listening.
- If approved, add host authentication and permitted playback controls
  (start/pause/next and start at 0 seconds where supported/permitted).
- Preserve a playback-provider abstraction so the core game does not become
  dependent on one provider or one API approval.
- Do not launch a commercial Spotify API/SDK trivia integration under standard
  developer access without the required approval.

### Playback principle

Build the core game so Plan A and Plan B share the same quiz/session engine.
Spotify integration should improve the playback UX, not determine whether
Quizlycs can exist or be tested.

## Phase 8 --- Languages

Initial target: Norwegian, Swedish, Danish, English, German and
Spanish. - Language-specific labels. - Approved translation/synonym
matching. - Preserve proper nouns. - Avoid mixed-language answer
bubbles. - Example: `Måne` may represent `Moon` where rules permit.

## Phase 9 --- Admin/catalogue tooling

-   Search/filter reviewed and pending items.
-   Inspect approved suggestions.
-   Correct concepts/matches.
-   Provenance/reason for approvals.
-   Batch operations after single-item workflow is safe.
-   Audit/health visibility.

## Phase 10 --- Monetisation

Later: - Free player experience. - Host/admin as paying customer. - Free
trial/limited free hosting. - Subscription and/or quiz packs. - Pub
quiz/business/event premium use.

## Explicitly deferred

Do not prioritise heavy visual polish, massive imports, complex
monetisation, broad language expansion or premature AI cost optimisation
before data quality and the core game work.

## Working principle

Finish one vertical slice before scaling it.

**Do not automate 10,000-song ingestion until Assistant approval and
concept rules produce clean data.**
