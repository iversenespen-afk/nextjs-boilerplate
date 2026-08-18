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
      .select(
        "id, status, current_song_match_id, current_options",
      )
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

  const options = Array.isArray(session.current_options)
    ? session.current_options
    : [];

  if (options.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Quizrommet mangler lagrede svaralternativer.",
      },
      { status: 409 },
    );
  }

  const { data: match, error: matchError } =
    await supabaseAdmin
      .from("song_matches")
      .select(`
        id,
        song_id,
        theme_id,
        songs (
          id,
          artist,
          title,
          spotify_id
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

  const { data: theme, error: themeError } =
    await supabaseAdmin
      .from("themes")
      .select("id, name")
      .eq("id", match.theme_id)
      .maybeSingle();

  if (themeError) {
    return NextResponse.json(
      {
        success: false,
        message: themeError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    question: {
      songMatchId: match.id,
      themeId: match.theme_id,
      themeName: theme?.name ?? match.theme_id,
      song: match.songs,
      options,
    },
  });
}
