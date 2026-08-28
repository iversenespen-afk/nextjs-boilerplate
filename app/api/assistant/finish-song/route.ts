import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type FinishSongRequest = {
  queueId?: number;
};

export async function POST(request: Request) {
  let body: FinishSongRequest;

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

  if (!queueId) {
    return NextResponse.json(
      {
        success: false,
        message: "queueId må være med.",
      },
      { status: 400 },
    );
  }

  const { data: queueItem, error: queueError } =
    await supabaseAdmin
      .from("match_review_queue")
      .select("spotify_id, theme_id")
      .eq("id", queueId)
      .maybeSingle();

  if (queueError) {
    return NextResponse.json(
      {
        success: false,
        message: queueError.message,
      },
      { status: 500 },
    );
  }

  if (!queueItem) {
    return NextResponse.json(
      {
        success: false,
        message: "Fant ikke køelementet.",
      },
      { status: 404 },
    );
  }

  const { data: song, error: songError } =
    await supabaseAdmin
      .from("songs")
      .select("id")
      .eq("spotify_id", queueItem.spotify_id)
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
        message: "Fant ikke sangen.",
      },
      { status: 404 },
    );
  }

  const { data: matches, error: matchesError } =
    await supabaseAdmin
      .from("song_matches")
      .select("concept_id, matched_text")
      .eq("song_id", song.id)
      .eq("theme_id", queueItem.theme_id)
      .eq("verified", true);

  if (matchesError) {
    return NextResponse.json(
      {
        success: false,
        message: matchesError.message,
      },
      { status: 500 },
    );
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Sangen har ingen godkjente treff for dette temaet.",
      },
      { status: 400 },
    );
  }

  const representativeMatch = matches[0];

  const { error: updateError } = await supabaseAdmin
    .from("match_review_queue")
    .update({
      concept_id: representativeMatch.concept_id,
      matched_text: representativeMatch.matched_text,
      verified: true,
      review_status: "approved",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", queueId);

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
    message: `Sangen er ferdig med ${matches.length} godkjente treff.`,
  });
}
