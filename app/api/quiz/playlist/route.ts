
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = Number(searchParams.get("sessionId"));

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json(
      { success: false, message: "Ugyldig sessionId." },
      { status: 400 },
    );
  }

  const { data: questions, error: questionsError } =
    await supabaseAdmin
      .from("quiz_session_questions")
      .select("question_number, song_id")
      .eq("session_id", sessionId)
      .order("question_number", { ascending: true });

  if (questionsError) {
    return NextResponse.json(
      { success: false, message: questionsError.message },
      { status: 500 },
    );
  }

  if (!questions || questions.length === 0) {
    return NextResponse.json(
      { success: false, message: "Fant ingen spørsmål." },
      { status: 404 },
    );
  }

  const songIds = [...new Set(questions.map((q) => q.song_id))];

  const { data: songs, error: songsError } =
    await supabaseAdmin
      .from("songs")
      .select("id, artist, title, spotify_id")
      .in("id", songIds);

  if (songsError) {
    return NextResponse.json(
      { success: false, message: songsError.message },
      { status: 500 },
    );
  }

  const songMap = new Map(
    (songs ?? []).map((song) => [song.id, song]),
  );

  const tracks = questions.map((question) => {
    const song = songMap.get(question.song_id);

    return {
      questionNumber: question.question_number,
      artist: song?.artist ?? null,
      title: song?.title ?? null,
      spotifyId: song?.spotify_id ?? null,
      spotifyUrl: song?.spotify_id
        ? `https://open.spotify.com/track/${song.spotify_id}`
        : null,
    };
  });

  return NextResponse.json({
    success: true,
    sessionId,
    trackCount: tracks.length,
    tracks,
  });
}
