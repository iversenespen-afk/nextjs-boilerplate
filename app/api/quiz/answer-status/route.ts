import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

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

  if (!session.current_song_match_id) {
    return NextResponse.json({
      success: true,
      answered: 0,
      total: 0,
    });
  }

  const { count: totalParticipants, error: participantsError } =
    await supabaseAdmin
      .from("quiz_participants")
      .select("id", { count: "exact", head: true })
      .eq("session_id", numericSessionId);

  if (participantsError) {
    return NextResponse.json(
      {
        success: false,
        message: participantsError.message,
      },
      { status: 500 },
    );
  }

  const { count: answeredParticipants, error: answersError } =
    await supabaseAdmin
      .from("quiz_answers")
      .select("id", { count: "exact", head: true })
      .eq("session_id", numericSessionId)
      .eq("song_match_id", session.current_song_match_id);

  if (answersError) {
    return NextResponse.json(
      {
        success: false,
        message: answersError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    answered: answeredParticipants ?? 0,
    total: totalParticipants ?? 0,
  });
}
