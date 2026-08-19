import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const accessToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("spotify_access_token="))
    ?.split("=")[1];

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        message: "Spotify er ikke koblet til.",
      },
      { status: 401 },
    );
  }

  // House of Pain – Jump Around
  const spotifyId = "3TZwjdclvWt7iPJUnMpgcs";

  const trackResponse = await fetch(
    `https://api.spotify.com/v1/tracks/${spotifyId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const track = await trackResponse.json();

  if (!trackResponse.ok) {
    return NextResponse.json(
      {
        success: false,
        source: "track",
        spotifyStatus: trackResponse.status,
        spotifyResponse: track,
      },
      { status: trackResponse.status },
    );
  }

  const artistId = track.artists?.[0]?.id;

  let artist = null;

  if (artistId) {
    const artistResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    artist = await artistResponse.json();
  }

  return NextResponse.json({
    success: true,
    track,
    artist,
  });
}
