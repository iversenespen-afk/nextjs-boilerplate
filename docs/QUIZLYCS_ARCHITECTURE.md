# Quizlycs Architecture

**Status:** Living architecture note\
**Last updated:** 10 August 2026

GitHub is the source of truth for code. This document explains the
system rather than copying source files.

## Stack

-   Next.js App Router
-   Vercel
-   Supabase
-   GitHub + GitHub Actions
-   OpenAI Responses API with structured JSON
-   Spotify IDs for song identity; playback integration is future work

## Core data

### `themes`

Quiz themes/categories.

### `concepts`

Canonical answer concepts. Important fields: - `id` - `label_no` -
`label_en` - `is_proper_noun` - `concept_class`

IDs should be stable canonical identifiers such as `kurt_cobain`.

### `songs`

Canonical songs with Spotify ID, artist and title. Spotify ID is
intended as stable external identity.

### `song_matches`

Verified song/theme/concept relationships with actual matched lyric
text. Multiple matches per song are supported.

### Review queue

Known fields: `id`, `spotify_id`, `artist`, `title`, `theme_id`,
`theme_name`, `source_playlist`, `concept_id`, `matched_text`,
`verified`, `review_status`, `notes`, `created_at`, `reviewed_at`.

Observed statuses: `to_review`, `approved`, `rejected`, `skipped`.

## Admin

### `/admin/review`

Existing password-protected manual review workflow.

### `/admin/assistant`

Current flow: 1. Fetch next queued song. 2. Display
song/theme/source/queue ID/Spotify ID. 3. Analyse with AI. 4. Display
structured suggestions.

Next: 5. Approve/reject suggestions. 6. Persist approved matches. 7.
Update queue. 8. Continue automatically.

## Assistant APIs

### `app/api/assistant/analyze/route.ts`

Validates input, obtains lyrics, builds prompt, calls OpenAI Responses
API with strict structured output, parses message/output_text and
returns normalized suggestions.

### `app/api/assistant/concepts/route.ts`

Fetches existing concepts relevant to the requested theme/class. Theme →
concept-class mapping is evolving domain logic and should eventually be
centralised.

### `lib/lyrics-provider.ts`

Provider abstraction. Currently mock lyrics. Later replace with licensed
provider without rewriting Assistant.

## AI suggestion contract

``` json
{
  "suggestions": [
    {
      "concept_id": "string",
      "matched_text": "string",
      "display_name": "string",
      "confidence": 0.0,
      "existing_concept": true,
      "explanation": "string"
    }
  ]
}
```

The AI is a candidate generator, not database authority.

Desired flow: Lyrics + theme + allowed/existing concepts → AI candidates
→ deterministic validation → human approval where needed → canonical
`song_matches`.

False negatives are generally preferable to speculative false positives.

## Audits

Known scripts: - `scripts/audit-concepts.mjs` -
`scripts/audit-songs.mjs` - `scripts/audit-song-matches.mjs` -
`scripts/audit-review-queue.mjs` - combined audit runner

Checks cover required fields, references, duplicates, Spotify IDs,
songs/matches, review statuses/timestamps and required approved-row
data.

## Deployment and secrets

Project deploys from GitHub to Vercel. OpenAI/Supabase credentials
belong in environment variables/secrets, never source code. OpenAI API
billing is separate from ChatGPT Plus.

## Multiplayer --- planned

Expected concepts: session, host, join code, participants, current
question/state, submitted answer, score and realtime updates. Supabase
is a natural candidate, but final design is not yet fixed.

## Source-of-truth policy

1.  GitHub --- code, migrations, scripts.
2.  Architecture --- how pieces fit.
3.  Roadmap --- priorities and sequence.
4.  Rulebook --- domain truth.

Update this document when architecture changes materially.
