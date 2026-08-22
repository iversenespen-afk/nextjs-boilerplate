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

  const { data: artists, error: artistsError } =
    await supabaseAdmin
      .from("artists")
      .select("id, spotify_artist_id, name")
      .eq("spotify_name_synced", false)
      .not("spotify_artist_id", "is", null)
      .order("id", { ascending: true })
      .limit(10);

  if (artistsError) {
    return NextResponse.json(
      {
        success: false,
        message: artistsError.message,
      },
      { status: 500 },
    );
  }

  if (!artists || artists.length === 0) {
    return NextResponse.json({
      success: true,
      processed: 0,
      succeeded: 0,
      failed: 0,
      message: "Alle artistnavn er allerede synkronisert.",
      results: [],
    });
  }

  const results: {
    artistId: number;
    oldName: string;
    newName?: string;
    success: boolean;
    message?: string;
  }[] = [];

  for (const artist of artists) {
    try {
      const spotifyResponse = await fetch(
        `https://api.spotify.com/v1/artists/${artist.spotify_artist_id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );

      const spotifyArtist = await spotifyResponse.json();

      if (!spotifyResponse.ok) {
        results.push({
          artistId: artist.id,
          oldName: artist.name,
          success: false,
          message:
            spotifyArtist?.error?.message ??
            `Spotify svarte ${spotifyResponse.status}.`,
        });

        continue;
      }

      const newName =
        spotifyArtist.name?.trim() || artist.name;

      const { error: updateError } =
        await supabaseAdmin
          .from("artists")
          .update({
            name: newName,
            spotify_name_synced: true,
          })
          .eq("id", artist.id);

      if (updateError) {
        results.push({
          artistId: artist.id,
          oldName: artist.name,
          success: false,
          message: updateError.message,
        });

        continue;
      }

      results.push({
        artistId: artist.id,
        oldName: artist.name,
        newName,
        success: true,
      });
    } catch {
      results.push({
        artistId: artist.id,
        oldName: artist.name,
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
