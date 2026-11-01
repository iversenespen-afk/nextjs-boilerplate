import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { selectQuizQuestions } from "@/lib/quiz-question-selection";

export const runtime = "nodejs";

type StartRequest = {
  sessionId?: number;
  questionCount?: number;
  showSongInfo?: boolean;
};

export async function POST(request: Request) {
  let body: StartRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Ugyldig JSON." },
      { status: 400 },
    );
  }

  const sessionId = body.sessionId;
  const questionCount = body.questionCount ?? 10;
  const showSongInfo = body.showSongInfo ?? false;

  if (!Number.isInteger(sessionId) || !sessionId || sessionId <= 0) {
    return NextResponse.json(
      { success: false, message: "Gyldig sessionId må være med." },
      { status: 400 },
    );
  }

  if (![10, 20, 30].includes(questionCount)) {
    return NextResponse.json(
      { success: false, message: "Velg 10, 20 eller 30 spørsmål." },
      { status: 400 },
    );
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("quiz_sessions")
    .select("id, status, quiz_type, theme_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json(
      { success: false, message: sessionError.message },
      { status: 500 },
    );
  }

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Fant ikke quizrommet." },
      { status: 404 },
    );
  }

  if (session.status !== "lobby") {
    return NextResponse.json(
      { success: false, message: "Quizrommet kan bare startes fra lobby." },
      { status: 409 },
    );
  }

  if (session.quiz_type !== "mixed" && session.quiz_type !== "theme") {
    return NextResponse.json(
      { success: false, message: "Ugyldig quiztype." },
      { status: 409 },
    );
  }

  let questions;
  try {
    questions = await selectQuizQuestions({
      quizType: session.quiz_type,
      themeId: session.theme_id,
      questionCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Kunne ikke velge spørsmål.",
      },
      { status: 409 },
    );
  }

  const firstQuestion = questions[0];
  if (!firstQuestion) {
    return NextResponse.json(
      { success: false, message: "Ingen spørsmål ble valgt." },
      { status: 409 },
    );
  }

  const { data: correctMatches, error: correctMatchesError } = await supabaseAdmin
    .from("song_matches")
    .select("concept_id")
    .eq("song_id", firstQuestion.songId)
    .eq("theme_id", firstQuestion.themeId)
    .eq("verified", true);

  if (correctMatchesError) {
    return NextResponse.json(
      { success: false, message: correctMatchesError.message },
      { status: 500 },
    );
  }

  const correctConceptIds = [
    ...new Set((correctMatches ?? []).map((row) => row.concept_id)),
  ];

  if (correctConceptIds.length === 0) {
    return NextResponse.json(
      { success: false, message: "Fant ingen gyldige svar for spørsmålet." },
      { status: 409 },
    );
  }

  const { data: groupRows, error: groupError } = await supabaseAdmin
    .from("theme_concept_groups")
    .select("group_id")
    .eq("theme_id", firstQuestion.themeId);

  if (groupError) {
    return NextResponse.json(
      { success: false, message: groupError.message },
      { status: 500 },
    );
  }

  const groupIds = (groupRows ?? []).map((row) => row.group_id);
  if (groupIds.length === 0) {
    return NextResponse.json(
      { success: false, message: "Temaet har ingen tillatte concept-grupper." },
      { status: 409 },
    );
  }

  const { data: candidateConcepts, error: conceptsError } = await supabaseAdmin
    .from("concepts")
    .select("id, label_no, group_id")
    .in("group_id", groupIds);

  if (conceptsError) {
    return NextResponse.json(
      { success: false, message: conceptsError.message },
      { status: 500 },
    );
  }

  const { data: correctConcepts, error: correctConceptsError } = await supabaseAdmin
    .from("concepts")
    .select("id, label_no, group_id")
    .in("id", correctConceptIds);

  if (correctConceptsError) {
    return NextResponse.json(
      { success: false, message: correctConceptsError.message },
      { status: 500 },
    );
  }

  if (!correctConcepts || correctConcepts.length === 0) {
    return NextResponse.json(
      { success: false, message: "Fant ikke concepts for de riktige svarene." },
      { status: 409 },
    );
  }

  const normalize = (label: string) => label.trim().toLowerCase();
  const correctLabels = new Set(correctConcepts.map((concept) => normalize(concept.label_no)));
  const seenDistractorLabels = new Set<string>();

  const distractors = (candidateConcepts ?? [])
    .filter((concept) => {
      if (correctConceptIds.includes(concept.id)) return false;
      const label = normalize(concept.label_no);
      if (correctLabels.has(label) || seenDistractorLabels.has(label)) return false;
      seenDistractorLabels.add(label);
      return true;
    })
    .sort(() => Math.random() - 0.5);

  const distractorCount = Math.max(0, 12 - correctConcepts.length);
  const currentOptions = [
    ...correctConcepts.map((concept) => ({ id: concept.id, label: concept.label_no })),
    ...distractors.slice(0, distractorCount).map((concept) => ({
      id: concept.id,
      label: concept.label_no,
    })),
  ].sort(() => Math.random() - 0.5);

  // Lagre hele spørsmålsrekkefølgen før rommet settes til playing.
  // Spørsmål 1 er aktivt, mens resten aktiveres av /api/quiz/next.
  const startedAt = new Date().toISOString();
  const historyRecords = questions.map((question, index) => ({
    session_id: sessionId,
    song_id: question.songId,
    theme_id: question.themeId,
    song_match_id: question.songMatchId,
    question_number: index + 1,
    started_at: index === 0 ? startedAt : null,
  }));

  const { data: existingHistory, error: existingHistoryError } = await supabaseAdmin
    .from("quiz_session_questions")
    .select("id")
    .eq("session_id", sessionId)
    .limit(1);

  if (existingHistoryError) {
    return NextResponse.json(
      { success: false, message: existingHistoryError.message },
      { status: 500 },
    );
  }

  if ((existingHistory ?? []).length > 0) {
    return NextResponse.json(
      { success: false, message: "Quizrommet har allerede registrerte spørsmål." },
      { status: 409 },
    );
  }

  const { error: historyError } = await supabaseAdmin
    .from("quiz_session_questions")
    .insert(historyRecords);

  if (historyError) {
    return NextResponse.json(
      { success: false, message: historyError.message },
      { status: 500 },
    );
  }

  const { data: updatedSession, error: updateError } = await supabaseAdmin
    .from("quiz_sessions")
    .update({
      status: "playing",
      started_at: startedAt,
      current_question_started_at: startedAt,
      current_song_match_id: firstQuestion.songMatchId,
      current_options: currentOptions,
      question_count: questionCount,
      show_song_info: showSongInfo,
    })
    .eq("id", sessionId)
    .eq("status", "lobby")
    .select("id, join_code, status, started_at, current_song_match_id, current_options")
    .maybeSingle();

  if (updateError || !updatedSession) {
    // Best-effort rollback hvis rommet ikke kunne startes.
    await supabaseAdmin
      .from("quiz_session_questions")
      .delete()
      .eq("session_id", sessionId);

    return NextResponse.json(
      { success: false, message: updateError?.message ?? "Quizrommet kunne ikke startes." },
      { status: updateError ? 500 : 409 },
    );
  }

  return NextResponse.json({
    success: true,
    session: updatedSession,
  });
}
