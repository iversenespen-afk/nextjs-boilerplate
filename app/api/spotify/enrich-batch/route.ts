import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function getCookieValue(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")[1];
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const accessToken = getCookieValue(
    cookieHeader,
    "spotify_access_token",
  );

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        message: "Spotify er ikke koblet til.",
      },
      { status: 401 },
    );
  }

  const { data: songs, error: songsError } =
    await supabaseAdmin
      .from("songs")
      .select("id, spotify_id, artist, title")
      .not("spotify_id", "is", null)
      .is("release_year", null)
      .order("id", { ascending: true })
      .limit(10);

  if (songsError) {
    return NextResponse.json(
      {
        success: false,
        message: songsError.message,
      },
      { status: 500 },
    );
  }

  if (!songs || songs.length === 0) {
    return NextResponse.json({
      success: true,
      processed: 0,
      succeeded: 0,
      failed: 0,
      message: "Ingen sanger mangler Spotify-metadata.",
      results: [],
    });
  }

  const results: {
    songId: number;
    artist: string;
    title: string;
    success: boolean;
    message?: string;
    releaseYear?: number | null;
  }[] = [];

  for (const song of songs) {
    if (!song.spotify_id) {
      results.push({
        songId: song.id,
        artist: song.artist,
        title: song.title,
        success: false,
        message: "spotify_id mangler.",
      });

      continue;
    }

    try {
      const spotifyResponse = await fetch(
        `https://api.spotify.com/v1/tracks/${song.spotify_id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );

      const track = await spotifyResponse.json();

      if (!spotifyResponse.ok) {
        results.push({
          songId: song.id,
          artist: song.artist,
          title: song.title,
          success: false,
          message:
            track?.error?.message ??
            `Spotify svarte ${spotifyResponse.status}.`,
        });

        continue;
      }

      const releaseDate =
        track.album?.release_date ?? null;

      const releaseYear =
        releaseDate && /^\d{4}/.test(releaseDate)
          ? Number(releaseDate.slice(0, 4))
          : null;

      const decade =
        releaseYear !== null
          ? Math.floor(releaseYear / 10) * 10
          : null;

      const metadata = {
        spotify_artist_id:
          track.artists?.[0]?.id ?? null,
        spotify_album_id:
          track.album?.id ?? null,
        album_name:
          track.album?.name ?? null,
        release_date: releaseDate,
        release_year: releaseYear,
        decade,
        duration_ms:
          track.duration_ms ?? null,
        explicit:
          track.explicit ?? null,
        isrc:
          track.external_ids?.isrc ?? null,
        album_type:
          track.album?.album_type ?? null,
        cover_url:
          track.album?.images?.[0]?.url ?? null,
      };

      const { error: updateError } =
        await supabaseAdmin
          .from("songs")
          .update(metadata)
          .eq("id", song.id);

      if (updateError) {
        results.push({
          songId: song.id,
          artist: song.artist,
          title: song.title,
          success: false,
          message: updateError.message,
        });

        continue;
      }

      results.push({
        songId: song.id,
        artist: song.artist,
        title: song.title,
        success: true,
        releaseYear,
      });
    } catch {
      results.push({
        songId: song.id,
        artist: song.artist,
        title: song.title,
        success: false,
        message: "Uventet feil under Spotify-oppslag.",
      });
    }
  }

  const succeeded = results.filter(
    (result) => result.success,
  ).length;

  const failed = results.length - succeeded;

  return NextResponse.json({
    success: true,
    processed: results.length,
    succeeded,
    failed,
    results,
  });
}
