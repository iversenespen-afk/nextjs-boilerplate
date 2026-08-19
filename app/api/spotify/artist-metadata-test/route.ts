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

export async function GET(request: Request) {
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

  const testArtists = [
    "Adele",
    "Avicii",
    "Weird Al",
    "Bee Gees",
  ];

  const results = [];

  for (const searchName of testArtists) {
    const { data: song, error } = await supabaseAdmin
      .from("songs")
      .select("artist, spotify_artist_id")
      .ilike("artist", `%${searchName}%`)
      .not("spotify_artist_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (error || !song?.spotify_artist_id) {
      results.push({
        searchName,
        success: false,
        message: error?.message ?? "Fant ikke artisten i songs.",
      });

      continue;
    }

    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/artists/${song.spotify_artist_id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    const artistData = await spotifyResponse.json();

    results.push({
      searchName,
      databaseArtist: song.artist,
      spotifyStatus: spotifyResponse.status,
      success: spotifyResponse.ok,
      spotifyResponse: artistData,
    });
  }

  return NextResponse.json({
    success: true,
    results,
  });
}
