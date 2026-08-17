import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const ANSWER_OPTION_COUNT = 12;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      {
        success: false,
        message: "sessionId mangler.",
      },
      { status: 400 },
    );
  }

  const numericSessionId = Number(sessionId);

  if (!Number.isInteger(numericSessionId) || numericSessionId <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Ugyldig sessionId.",
      },
      { status: 400 },
    );
  }

  const { data: session, error: sessionError } =
    await supabaseAdmin
      .from("quiz_sessions")
      .select("id, status, current_song_match_id")
      .eq("id", numericSessionId)
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
        message: "Quizen er ikke startet.",
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

  const { data: match, error: matchError } =
    await supabaseAdmin
      .from("song_matches")
      .select(`
        id,
        theme_id,
        concept_id,
        songs (
          id,
          artist,
          title,
          spotify_id
        ),
        themes (
          id,
          name
        ),
        concepts (
          id,
          label_no,
          label_en,
          group_id
        )
      `)
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
        message: "Fant ikke aktivt song_match.",
      },
      { status: 404 },
    );
  }

  const { data: groupRows, error: groupError } =
    await supabaseAdmin
      .from("theme_concept_groups")
      .select("group_id")
      .eq("theme_id", match.theme_id);

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
        message: "Temaet har ingen tillatte concept-grupper.",
      },
      { status: 409 },
    );
  }

  const { data: candidateConcepts, error: conceptsError } =
    await supabaseAdmin
      .from("concepts")
      .select("id, label_no, label_en, group_id")
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

  const distractors = (candidateConcepts ?? [])
    .filter((concept) => concept.id !== match.concept_id)
    .sort(() => Math.random() - 0.5)
    .slice(0, ANSWER_OPTION_COUNT - 1);

  const correctConcept = match.concepts;

  if (!correctConcept) {
    return NextResponse.json(
      {
        success: false,
        message: "Fant ikke riktig concept.",
      },
      { status: 409 },
    );
  }

  const options = [
    {
      id: correctConcept.id,
      label: correctConcept.label_no,
    },
    ...distractors.map((concept) => ({
      id: concept.id,
      label: concept.label_no,
    })),
  ].sort(() => Math.random() - 0.5);

  return NextResponse.json({
    success: true,
    question: {
      songMatchId: match.id,
      themeId: match.theme_id,
      themeName: match.themes?.name ?? match.theme_id,
      song: match.songs,
      correctConceptId: match.concept_id,
      options,
    },
  });
}
