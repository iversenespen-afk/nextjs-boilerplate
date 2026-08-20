import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type ImportTrack = {
  spotify_id: string;
  artist: string;
  title: string;
  spotify_artist_id?: string | null;
  spotify_album_id?: string | null;
  album_name?: string | null;
  release_date?: string | null;
  release_year?: number | null;
  decade?: number | null;
  duration_ms?: number | null;
  explicit?: boolean | null;
  isrc?: string | null;
  album_type?: string | null;
  cover_url?: string | null;
};

type ImportRequest = {
  tracks?: ImportTrack[];
  themeId?: string;
  themeName?: string;
  sourcePlaylist?: string;
};

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  
  const accessToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) =>
      part.startsWith("spotify_access_token="),
    )
    ?.slice("spotify_access_token=".length);
  let body: ImportRequest;

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

  const tracks = body.tracks ?? [];
  const themeId = body.themeId?.trim();
  const themeName = body.themeName?.trim();
  const sourcePlaylist = body.sourcePlaylist?.trim() || null;

  if (
    tracks.length === 0 ||
    !themeId ||
    !themeName
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "tracks, themeId og themeName må være med.",
      },
      { status: 400 },
    );
  }

  let songsInserted = 0;
  let queueInserted = 0;
  let skipped = 0;

  for (const track of tracks) {
    if (
      !track.spotify_id ||
      !track.artist ||
      !track.title
    ) {
      skipped += 1;
      continue;
    }

    const { data: existingSong, error: existingSongError } =
      await supabaseAdmin
        .from("songs")
        .select("id")
        .eq("spotify_id", track.spotify_id)
        .maybeSingle();

    if (existingSongError) {
      throw new Error(existingSongError.message);
    }

    let songId = existingSong?.id;

    if (!songId) {
      const { data: insertedSong, error: insertSongError } =
        await supabaseAdmin
          .from("songs")
          .insert({
  spotify_id: track.spotify_id,
  artist: track.artist,
  title: track.title,
  spotify_artist_id: track.spotify_artist_id ?? null,
  spotify_album_id: track.spotify_album_id ?? null,
  album_name: track.album_name ?? null,
  release_date: track.release_date ?? null,
  release_year: track.release_year ?? null,
  decade: track.decade ?? null,
  duration_ms: track.duration_ms ?? null,
  explicit: track.explicit ?? null,
  isrc: track.isrc ?? null,
  album_type: track.album_type ?? null,
  cover_url: track.cover_url ?? null,
})
          .select("id")
          .single();

      if (insertSongError) {
        throw new Error(insertSongError.message);
      }

      songId = insertedSong.id;
      songsInserted += 1;
    }

    const { data: existingQueue, error: existingQueueError } =
      await supabaseAdmin
        .from("match_review_queue")
        .select("id")
        .eq("spotify_id", track.spotify_id)
        .eq("theme_id", themeId)
        .maybeSingle();

    if (existingQueueError) {
      throw new Error(existingQueueError.message);
    }

    if (existingQueue) {
      skipped += 1;
      continue;
    }

    const { error: queueInsertError } =
      await supabaseAdmin
        .from("match_review_queue")
        .insert({
          spotify_id: track.spotify_id,
          artist: track.artist,
          title: track.title,
          theme_id: themeId,
          theme_name: themeName,
          source_playlist: sourcePlaylist,
          concept_id: null,
          matched_text: null,
          verified: false,
          review_status: "to_review",
          notes: null,
        });

    if (queueInsertError) {
      throw new Error(queueInsertError.message);
    }

    queueInserted += 1;
  }

  return NextResponse.json({
    success: true,
    found: tracks.length,
    songsInserted,
    queueInserted,
    skipped,
  });
}
