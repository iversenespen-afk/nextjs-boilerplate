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

  let body: {
    songId?: number;
  };

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

  const songId = body.songId;

  if (!Number.isInteger(songId) || !songId || songId <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Gyldig songId må være med.",
      },
      { status: 400 },
    );
  }

  const { data: song, error: songError } =
    await supabaseAdmin
      .from("songs")
      .select("id, spotify_id, artist, title")
      .eq("id", songId)
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

  if (!song.spotify_id) {
    return NextResponse.json(
      {
        success: false,
        message: "Sangen mangler spotify_id.",
      },
      { status: 409 },
    );
  }

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
    return NextResponse.json(
      {
        success: false,
        message:
          track?.error?.message ??
          "Kunne ikke hente metadata fra Spotify.",
        spotifyStatus: spotifyResponse.status,
      },
      { status: spotifyResponse.status },
    );
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

  const spotifyArtistId =
    track.artists?.[0]?.id ?? null;

  const spotifyAlbumId =
    track.album?.id ?? null;

  const albumName =
    track.album?.name ?? null;

  const coverUrl =
    track.album?.images?.[0]?.url ?? null;

  const metadata = {
    spotify_artist_id: spotifyArtistId,
    spotify_album_id: spotifyAlbumId,
    album_name: albumName,
    release_date: releaseDate,
    release_year: releaseYear,
    decade,
    duration_ms: track.duration_ms ?? null,
    explicit: track.explicit ?? null,
    isrc: track.external_ids?.isrc ?? null,
    album_type: track.album?.album_type ?? null,
    cover_url: coverUrl,
  };

  const { data: updatedSong, error: updateError } =
    await supabaseAdmin
      .from("songs")
      .update(metadata)
      .eq("id", song.id)
      .select(`
        id,
        artist,
        title,
        spotify_id,
        spotify_artist_id,
        spotify_album_id,
        album_name,
        release_date,
        release_year,
        decade,
        duration_ms,
        explicit,
        isrc,
        album_type,
        cover_url
      `)
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
    song: updatedSong,
  });
}
