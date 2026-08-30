import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type NextRequest = {
  sessionId?: number;
};

export async function POST(request: Request) {
  let body: NextRequest;

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
      .select("id, status, current_song_match_id, question_count")
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

  if (session.status !== "playing") {
    return NextResponse.json(
      {
        success: false,
        message: "Quizrommet er ikke aktivt.",
      },
      { status: 409 },
    );
  }
  const { data: historyRows, error: historyError } =
  await supabaseAdmin
    .from("quiz_session_questions")
    .select("song_id, theme_id, question_number")
    .eq("session_id", sessionId)
    .order("question_number", { ascending: true });

if (historyError) {
  return NextResponse.json(
    {
      success: false,
      message: historyError.message,
    },
    { status: 500 },
  );
}

const usedQuestionKeys = new Set(
  (historyRows ?? []).map(
    (row) => `${row.song_id}|${row.theme_id}`,
  ),
);
  const currentQuestionNumber = historyRows?.length ?? 0;

if (currentQuestionNumber >= session.question_count) {
  const { data: finishedSession, error: finishError } =
    await supabaseAdmin
      .from("quiz_sessions")
      .update({
        status: "finished",
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("status", "playing")
      .select("id, status, ended_at")
      .single();

  if (finishError) {
    return NextResponse.json(
      {
        success: false,
        message: finishError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    finished: true,
    session: finishedSession,
  });
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

  const availableMatches = (matchRows ?? []).filter((match) => {
  const questionKey = `${match.song_id}|${match.theme_id}`;

  return !usedQuestionKeys.has(questionKey);
});

  if (availableMatches.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Fant ingen flere verifiserte quiz-spørsmål.",
      },
      { status: 409 },
    );
  }

  const randomMatch =
    availableMatches[
      Math.floor(Math.random() * availableMatches.length)
    ];
  const nextQuestionNumber =
  (historyRows?.length ?? 0) + 1;

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

  const { data: correctConcepts, error: correctConceptsError } =
  await supabaseAdmin
    .from("concepts")
    .select("id, label_no, group_id")
    .in("id", correctConceptIds);

if (correctConceptsError) {
  return NextResponse.json(
    {
      success: false,
      message: correctConceptsError.message,
    },
    { status: 500 },
  );
}

if (!correctConcepts || correctConcepts.length === 0) {
  return NextResponse.json(
    {
      success: false,
      message: "Fant ikke concepts for de riktige svarene.",
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
        current_question_started_at: new Date().toISOString(),
        current_song_match_id: randomMatch.id,
        current_options: currentOptions,
      })
      .eq("id", sessionId)
      .eq("status", "playing")
      .select(
        "id, status, current_song_match_id, current_options",
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
const { error: questionHistoryError } =
  await supabaseAdmin
    .from("quiz_session_questions")
    .insert({
      session_id: sessionId,
      song_id: randomMatch.song_id,
      theme_id: randomMatch.theme_id,
      song_match_id: randomMatch.id,
      question_number: nextQuestionNumber,
      started_at: new Date().toISOString(),
    });

if (questionHistoryError) {
  return NextResponse.json(
    {
      success: false,
      message: questionHistoryError.message,
    },
    { status: 500 },
  );
}
  return NextResponse.json({
    success: true,
    session: updatedSession,
  });
}
