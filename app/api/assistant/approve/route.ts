import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type ApproveRequest = {
  queueId?: number;
  spotifyId?: string;
  themeId?: string;
  conceptId?: string;
  matchedText?: string;
};

export async function POST(request: Request) {
  let body: ApproveRequest;

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

  const {
    queueId,
    spotifyId,
    themeId,
    conceptId,
    matchedText,
  } = body;

  if (
    !queueId ||
    !spotifyId?.trim() ||
    !themeId?.trim() ||
    !conceptId?.trim() ||
    !matchedText?.trim()
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "queueId, spotifyId, themeId, conceptId og matchedText må være med.",
      },
      { status: 400 },
    );
  }

// Kontroller at queueId faktisk tilhører samme sang og tema
const { data: queueItem, error: queueItemError } =
  await supabaseAdmin
    .from("match_review_queue")
    .select("id, spotify_id, theme_id")
    .eq("id", queueId)
    .maybeSingle();

if (queueItemError) {
  return NextResponse.json(
    {
      success: false,
      message: queueItemError.message,
    },
    { status: 500 },
  );
}

if (!queueItem) {
  return NextResponse.json(
    {
      success: false,
      message: "Fant ikke review-raden.",
    },
    { status: 404 },
  );
}

if (
  queueItem.spotify_id !== spotifyId.trim() ||
  queueItem.theme_id !== themeId.trim()
) {
  return NextResponse.json(
    {
      success: false,
      message:
        "queueId, spotifyId og themeId samsvarer ikke med review-raden.",
    },
    { status: 409 },
  );
}
  
  // 1. Finn intern song_id fra Spotify-ID
  const { data: song, error: songError } = await supabaseAdmin
    .from("songs")
    .select("id")
    .eq("spotify_id", spotifyId.trim())
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

  // 2. Kontroller at concept faktisk finnes
  const { data: concept, error: conceptError } = await supabaseAdmin
    .from("concepts")
    .select("id, group_id")
    .eq("id", conceptId.trim())
    .maybeSingle();

  if (conceptError) {
    return NextResponse.json(
      {
        success: false,
        message: conceptError.message,
      },
      { status: 500 },
    );
  }

  if (!concept) {
    return NextResponse.json(
      {
        success: false,
        message:
          `Concept "${conceptId}" finnes ikke ennå. ` +
          "Nye concepts må opprettes før de kan godkjennes.",
      },
      { status: 409 },
    );
  }

  if (!concept.group_id) {
  return NextResponse.json(
    {
      success: false,
      message:
        `Concept "${conceptId}" mangler group_id og kan ikke godkjennes.`,
    },
    { status: 409 },
  );
}

const {
  data: allowedThemeGroup,
  error: allowedThemeGroupError,
} = await supabaseAdmin
  .from("theme_concept_groups")
  .select("theme_id")
  .eq("theme_id", themeId.trim())
  .eq("group_id", concept.group_id)
  .maybeSingle();

if (allowedThemeGroupError) {
  return NextResponse.json(
    {
      success: false,
      message: allowedThemeGroupError.message,
    },
    { status: 500 },
  );
}

if (!allowedThemeGroup) {
  return NextResponse.json(
    {
      success: false,
      message:
        `Concept "${conceptId}" tilhører gruppen "${concept.group_id}", ` +
        `som ikke er tillatt for tema "${themeId}".`,
    },
    { status: 409 },
  );
}

  // 3. Sjekk om samme match allerede finnes
  const { data: existingMatch, error: existingMatchError } =
    await supabaseAdmin
      .from("song_matches")
      .select("id")
      .eq("song_id", song.id)
      .eq("theme_id", themeId.trim())
      .eq("concept_id", conceptId.trim())
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

  // 4. Opprett song_match hvis den ikke finnes
  if (!existingMatch) {
    const { error: insertError } = await supabaseAdmin
      .from("song_matches")
      .insert({
        song_id: song.id,
        theme_id: themeId.trim(),
        concept_id: conceptId.trim(),
        matched_text: matchedText.trim(),
        verified: true,
      });

    if (insertError) {
      return NextResponse.json(
        {
          success: false,
          message: insertError.message,
        },
        { status: 500 },
      );
    }
  }

  const { error: suggestionError } = await supabaseAdmin
  .from("assistant_suggestions")
  .update({
    status: "approved",
    reviewed_at: new Date().toISOString(),
  })
  .eq("queue_id", queueId)
  .eq("concept_id", conceptId.trim())
  .eq("status", "pending");

if (suggestionError) {
  return NextResponse.json(
    {
      success: false,
      message: suggestionError.message,
    },
    { status: 500 },
  );
}
  const { count: pendingCount, error: pendingError } =
  await supabaseAdmin
    .from("assistant_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("queue_id", queueId)
    .eq("status", "pending");

if (pendingError) {
  return NextResponse.json(
    {
      success: false,
      message: pendingError.message,
    },
    { status: 500 },
  );
}

if ((pendingCount ?? 0) === 0) {
  const { count: approvedCount, error: approvedCountError } =
    await supabaseAdmin
      .from("assistant_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("queue_id", queueId)
      .eq("status", "approved");

  if (approvedCountError) {
    return NextResponse.json(
      {
        success: false,
        message: approvedCountError.message,
      },
      { status: 500 },
    );
  }

  const finalStatus =
    (approvedCount ?? 0) > 0 ? "approved" : "rejected";

  const { error: queueError } = await supabaseAdmin
    .from("match_review_queue")
    .update({
      concept_id:
        finalStatus === "approved" ? conceptId.trim() : null,
      matched_text:
        finalStatus === "approved" ? matchedText.trim() : null,
      verified: finalStatus === "approved",
      review_status: finalStatus,
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
}
  return NextResponse.json({
    success: true,
    message: existingMatch
      ? "Treffet fantes allerede. Review-raden er godkjent."
      : "Forslaget er godkjent og lagret.",
  });
}
