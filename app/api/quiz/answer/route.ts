import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type AnswerRequest = {
  sessionId?: number;
  participantId?: number;
  selectedConceptId?: string;
};

export async function POST(request: Request) {
  let body: AnswerRequest;

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
  const participantId = body.participantId;
  const selectedConceptId = body.selectedConceptId?.trim();

  if (
    !Number.isInteger(sessionId) ||
    !sessionId ||
    sessionId <= 0 ||
    !Number.isInteger(participantId) ||
    !participantId ||
    participantId <= 0 ||
    !selectedConceptId
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Gyldig sessionId, participantId og selectedConceptId må være med.",
      },
      { status: 400 },
    );
  }

  const { data: session, error: sessionError } =
    await supabaseAdmin
      .from("quiz_sessions")
      .select(
        "id, status, current_song_match_id, current_question_started_at",
      )
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
        message: "Quizen er ikke aktiv.",
      },
      { status: 409 },
    );
  }

  if (!session.current_song_match_id) {
    return NextResponse.json(
      {
        success: false,
        message: "Quizrommet har ikke noe aktivt spørsmål.",
      },
      { status: 409 },
    );
  }

  const { data: participant, error: participantError } =
    await supabaseAdmin
      .from("quiz_participants")
      .select("id, session_id")
      .eq("id", participantId)
      .maybeSingle();

  if (participantError) {
    return NextResponse.json(
      {
        success: false,
        message: participantError.message,
      },
      { status: 500 },
    );
  }

  if (!participant) {
    return NextResponse.json(
      {
        success: false,
        message: "Fant ikke spilleren.",
      },
      { status: 404 },
    );
  }

  if (participant.session_id !== session.id) {
    return NextResponse.json(
      {
        success: false,
        message: "Spilleren tilhører ikke dette quizrommet.",
      },
      { status: 409 },
    );
  }

  const { data: match, error: matchError } =
    await supabaseAdmin
      .from("song_matches")
      .select("id, song_id, theme_id, concept_id")
      .eq("id", session.current_song_match_id)
      .maybeSingle();

  if (matchError) {
    return NextResponse.json(
      {
        success: false,
        message: matchError.message,
      },
      { status: 500 },
    );
  }

  if (!match) {
    return NextResponse.json(
      {
        success: false,
        message: "Fant ikke aktivt spørsmål.",
      },
      { status: 404 },
    );
  }

  const { data: correctMatches, error: correctMatchesError } =
  await supabaseAdmin
    .from("song_matches")
    .select("concept_id")
    .eq("song_id", match.song_id)
    .eq("theme_id", match.theme_id)
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

const correctConceptIds = new Set(
  (correctMatches ?? []).map((row) => row.concept_id),
);

  const { data: selectedConcept, error: conceptError } =
    await supabaseAdmin
      .from("concepts")
      .select("id")
      .eq("id", selectedConceptId)
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

  if (!selectedConcept) {
    return NextResponse.json(
      {
        success: false,
        message: "Valgt svaralternativ finnes ikke.",
      },
      { status: 404 },
    );
  }

  const isCorrect = correctConceptIds.has(selectedConceptId);
  let pointsAwarded = 0;

if (isCorrect && session.current_question_started_at) {
  const questionStartedAt = new Date(
    session.current_question_started_at,
  ).getTime();

  const answeredAt = Date.now();

  const elapsedSeconds = Math.max(
    0,
    Math.floor((answeredAt - questionStartedAt) / 1000),
  );

  pointsAwarded = Math.max(
    50,
    100 - Math.floor(elapsedSeconds / 2),
  );
}

  const { error: answerError } = await supabaseAdmin
    .from("quiz_answers")
    .insert({
      session_id: session.id,
      participant_id: participant.id,
      song_match_id: match.id,
      selected_concept_id: selectedConceptId,
      is_correct: isCorrect,
      points_awarded: pointsAwarded,
    });

  if (answerError) {
    if (answerError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "Du har allerede svart på dette spørsmålet.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: answerError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    result: {
      isCorrect,
      pointsAwarded,
    },
  });
}
