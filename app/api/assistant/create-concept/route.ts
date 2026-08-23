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
  groupId?: string;
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
  const requestedGroupId = body.groupId?.trim();

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

// 2. Finn concept-gruppe(r) for temaet
const { data: groupRows, error: groupError } =
  await supabaseAdmin
    .from("theme_concept_groups")
    .select("group_id")
    .eq("theme_id", themeId);

if (groupError) {
  return NextResponse.json(
    {
      success: false,
      message: groupError.message,
    },
    { status: 500 },
  );
}

const groupIds = (groupRows ?? []).map(
  (row: { group_id: string }) => row.group_id,
);

if (groupIds.length === 0) {
  return NextResponse.json(
    {
      success: false,
      message: `Ingen concept-grupper er koblet til tema ${themeId}.`,
    },
    { status: 400 },
  );
}

let groupId: string;

if (groupIds.length === 1) {
  groupId = groupIds[0];
} else {
  if (!requestedGroupId) {
    return NextResponse.json(
      {
        success: false,
        message:
          `Tema ${themeId} har flere concept-grupper. Velg gruppe.`,
        groupIds,
      },
      { status: 400 },
    );
  }

  if (!groupIds.includes(requestedGroupId)) {
    return NextResponse.json(
      {
        success: false,
        message:
          `Gruppen ${requestedGroupId} er ikke tillatt for tema ${themeId}.`,
      },
      { status: 400 },
    );
  }

  groupId = requestedGroupId;
}

// 3. Sjekk om concept allerede finnes
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
const { data: suggestion, error: suggestionFetchError } =
  await supabaseAdmin
    .from("assistant_suggestions")
    .select(
      "label_no, label_en, label_da, label_sv, label_de, label_es",
    )
    .eq("queue_id", queueId)
    .eq("concept_id", conceptId)
    .eq("status", "pending")
    .maybeSingle();

if (suggestionFetchError) {
  return NextResponse.json(
    {
      success: false,
      message: suggestionFetchError.message,
    },
    { status: 500 },
  );
}
// 4. Opprett concept hvis det ikke finnes
if (!existingConcept) {
  const { error: conceptInsertError } = await supabaseAdmin
    .from("concepts")
    .insert({
  id: conceptId,
  label_no:
    suggestion?.label_no?.trim() || displayName,
  label_en:
    suggestion?.label_en?.trim() || displayName,
  label_da:
    suggestion?.label_da?.trim() || null,
  label_sv:
    suggestion?.label_sv?.trim() || null,
  label_de:
    suggestion?.label_de?.trim() || null,
  label_es:
    suggestion?.label_es?.trim() || null,
  is_proper_noun: true,
  concept_class: conceptClass,
  group_id: groupId,
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

// 5. Sjekk om song_match allerede finnes
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

// 6. Opprett song_match hvis den ikke finnes
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
const { error: suggestionError } = await supabaseAdmin
  .from("assistant_suggestions")
  .update({
    status: "approved",
    reviewed_at: new Date().toISOString(),
  })
  .eq("queue_id", queueId)
  .eq("concept_id", conceptId)
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
        finalStatus === "approved" ? conceptId : null,
      matched_text:
        finalStatus === "approved" ? matchedText : null,
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
  message: existingConcept
    ? `Concept "${displayName}" fantes allerede. Treffet er godkjent.`
    : `Concept "${displayName}" er opprettet og treffet er godkjent.`,
});
}
