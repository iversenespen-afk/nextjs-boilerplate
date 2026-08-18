import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type StartRequest = {
  sessionId?: number;
};

export async function POST(request: Request) {
  let body: StartRequest;

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

  const sessionId = body.sessionId;

  if (!Number.isInteger(sessionId) || !sessionId || sessionId <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Gyldig sessionId må være med.",
      },
      { status: 400 },
    );
  }

  const { data: session, error: sessionError } =
    await supabaseAdmin
      .from("quiz_sessions")
      .select("id, status")
      .eq("id", sessionId)
      .maybeSingle();

  if (sessionError) {
    return NextResponse.json(
      {
        success: false,
        message: sessionError.message,
      },
      { status: 500 },
    );
  }

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: "Fant ikke quizrommet.",
      },
      { status: 404 },
    );
  }

  if (session.status !== "lobby") {
    return NextResponse.json(
      {
        success: false,
        message: "Quizrommet kan bare startes fra lobby.",
      },
      { status: 409 },
    );
  }

  const { data: matchRows, error: matchError } =
  await supabaseAdmin
    .from("song_matches")
    .select("id, song_id, theme_id")
    .eq("verified", true);

if (matchError) {
  return NextResponse.json(
    {
      success: false,
      message: matchError.message,
    },
    { status: 500 },
  );
}

if (!matchRows || matchRows.length === 0) {
  return NextResponse.json(
    {
      success: false,
      message: "Fant ingen verifiserte quiz-spørsmål.",
    },
    { status: 409 },
  );
}

const randomMatch =
  matchRows[Math.floor(Math.random() * matchRows.length)];
  const { data: correctMatches, error: correctMatchesError } =
  await supabaseAdmin
    .from("song_matches")
    .select("concept_id")
    .eq("song_id", randomMatch.song_id)
    .eq("theme_id", randomMatch.theme_id)
    .eq("verified", true);

if (correctMatchesError) {
  return NextResponse.json(
    {
      success: false,
      message: correctMatchesError.message,
    },
    { status: 500 },
  );
}

const correctConceptIds = [
  ...new Set(
    (correctMatches ?? []).map((row) => row.concept_id),
  ),
];

if (correctConceptIds.length === 0) {
  return NextResponse.json(
    {
      success: false,
      message: "Fant ingen gyldige svar for spørsmålet.",
    },
    { status: 409 },
  );
}
  const { data: groupRows, error: groupError } =
  await supabaseAdmin
    .from("theme_concept_groups")
    .select("group_id")
    .eq("theme_id", randomMatch.theme_id);

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
  (row) => row.group_id,
);

if (groupIds.length === 0) {
  return NextResponse.json(
    {
      success: false,
      message: "Temaet har ingen tillatte concept-grupper.",
    },
    { status: 409 },
  );
}

const { data: candidateConcepts, error: conceptsError } =
  await supabaseAdmin
    .from("concepts")
    .select("id, label_no, group_id")
    .in("group_id", groupIds);

if (conceptsError) {
  return NextResponse.json(
    {
      success: false,
      message: conceptsError.message,
    },
    { status: 500 },
  );
}

const correctConcepts = (candidateConcepts ?? []).filter(
  (concept) => correctConceptIds.includes(concept.id),
);

if (correctConcepts.length === 0) {
  return NextResponse.json(
    {
      success: false,
      message: "Fant ingen riktige concepts blant temaets concepts.",
    },
    { status: 409 },
  );
}

const distractors = (candidateConcepts ?? [])
  .filter(
    (concept) => !correctConceptIds.includes(concept.id),
  )
  .sort(() => Math.random() - 0.5);

const answerOptionCount = 12;

const distractorCount = Math.max(
  0,
  answerOptionCount - correctConcepts.length,
);

const selectedDistractors = distractors.slice(
  0,
  distractorCount,
);

const currentOptions = [
  ...correctConcepts.map((concept) => ({
    id: concept.id,
    label: concept.label_no,
  })),
  ...selectedDistractors.map((concept) => ({
    id: concept.id,
    label: concept.label_no,
  })),
].sort(() => Math.random() - 0.5);
  
  const { data: updatedSession, error: updateError } =
    await supabaseAdmin
      .from("quiz_sessions")
      .update({
  status: "playing",
  started_at: new Date().toISOString(),
  current_question_started_at: new Date().toISOString(),
  current_song_match_id: randomMatch.id,
  current_options: currentOptions,
})
      .eq("id", sessionId)
      .eq("status", "lobby")
      .select(
  "id, join_code, status, started_at, current_song_match_id, current_options",
)
      .single();

  if (updateError) {
    return NextResponse.json(
      {
        success: false,
        message: updateError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    session: updatedSession,
  });
}
