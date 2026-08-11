import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CreateConceptRequest = {
  queueId?: number;
  spotifyId?: string;
  themeId?: string;
  conceptId?: string;
  displayName?: string;
  conceptClass?: string;
  matchedText?: string;
};

export async function POST(request: Request) {
  let body: CreateConceptRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Ugyldig JSON.",
      },
      { status: 400 },
    );
  }

  const queueId = body.queueId;
  const spotifyId = body.spotifyId?.trim();
  const themeId = body.themeId?.trim();
  const conceptId = body.conceptId?.trim();
  const displayName = body.displayName?.trim();
  const conceptClass = body.conceptClass?.trim();
  const matchedText = body.matchedText?.trim();

  if (
  !queueId ||
  !spotifyId ||
  !themeId ||
  !conceptId ||
  !displayName ||
  !conceptClass ||
  !matchedText
) {
    return NextResponse.json(
      {
        success: false,
        message:
          "queueId, spotifyId, themeId, conceptId, displayName, conceptClass og matchedText må være med.",
      },
      { status: 400 },
    );
  }

  // 1. Finn intern song_id fra Spotify-ID
const { data: song, error: songError } = await supabaseAdmin
  .from("songs")
  .select("id")
  .eq("spotify_id", spotifyId)
  .maybeSingle();

if (songError) {
  return NextResponse.json(
    {
      success: false,
      message: songError.message,
    },
    { status: 500 },
  );
}

if (!song) {
  return NextResponse.json(
    {
      success: false,
      message: "Fant ikke sangen i songs-tabellen.",
    },
    { status: 404 },
  );
}

// 2. Sjekk om concept allerede finnes
const { data: existingConcept, error: existingConceptError } =
  await supabaseAdmin
    .from("concepts")
    .select("id")
    .eq("id", conceptId)
    .maybeSingle();

if (existingConceptError) {
  return NextResponse.json(
    {
      success: false,
      message: existingConceptError.message,
    },
    { status: 500 },
  );
}

// 3. Opprett concept hvis det ikke finnes
if (!existingConcept) {
  const { error: conceptInsertError } = await supabaseAdmin
    .from("concepts")
    .insert({
      id: conceptId,
      label_no: displayName,
      label_en: displayName,
      is_proper_noun: true,
      concept_class: conceptClass,
    });

  if (conceptInsertError) {
    return NextResponse.json(
      {
        success: false,
        message: conceptInsertError.message,
      },
      { status: 500 },
    );
  }
}

// 4. Sjekk om song_match allerede finnes
const { data: existingMatch, error: existingMatchError } =
  await supabaseAdmin
    .from("song_matches")
    .select("id")
    .eq("song_id", song.id)
    .eq("theme_id", themeId)
    .eq("concept_id", conceptId)
    .maybeSingle();

if (existingMatchError) {
  return NextResponse.json(
    {
      success: false,
      message: existingMatchError.message,
    },
    { status: 500 },
  );
}

// 5. Opprett song_match hvis den ikke finnes
if (!existingMatch) {
  const { error: matchInsertError } = await supabaseAdmin
    .from("song_matches")
    .insert({
      song_id: song.id,
      theme_id: themeId,
      concept_id: conceptId,
      matched_text: matchedText,
      verified: true,
    });

  if (matchInsertError) {
    return NextResponse.json(
      {
        success: false,
        message: matchInsertError.message,
      },
      { status: 500 },
    );
  }
}
// 6. Marker review-raden som godkjent
const { error: queueError } = await supabaseAdmin
  .from("match_review_queue")
  .update({
    concept_id: conceptId,
    matched_text: matchedText,
    verified: true,
    review_status: "approved",
    reviewed_at: new Date().toISOString(),
  })
  .eq("id", queueId);

if (queueError) {
  return NextResponse.json(
    {
      success: false,
      message: queueError.message,
    },
    { status: 500 },
  );
}
  return NextResponse.json({
  success: true,
  message: existingConcept
    ? `Concept "${displayName}" fantes allerede. Treffet er godkjent.`
    : `Concept "${displayName}" er opprettet og treffet er godkjent.`,
});
}
