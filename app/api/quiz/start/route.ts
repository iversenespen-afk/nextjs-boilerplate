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
    .select("id")
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
  const { data: updatedSession, error: updateError } =
    await supabaseAdmin
      .from("quiz_sessions")
      .update({
  status: "playing",
  started_at: new Date().toISOString(),
  current_song_match_id: randomMatch.id,
})
      .eq("id", sessionId)
      .eq("status", "lobby")
      .select("id, join_code, status, started_at")
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
