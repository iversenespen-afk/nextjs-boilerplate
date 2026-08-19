import { NextResponse } from "next/server";

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
    let body: {
    spotifyId?: string;
  } = {};

  try {
    body = await request.json();
  } catch {
    // Tom body er tillatt for den eksisterende testknappen.
  }

  const spotifyId = body.spotifyId?.trim();

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

  const spotifyUri = spotifyId
  ? `spotify:track:${spotifyId}`
  : "spotify:track:4iV5W9uYEdYUVa79Axb7Rh";

  const spotifyResponse = await fetch(
    "https://api.spotify.com/v1/me/player/play",
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [spotifyUri],
        position_ms: 0,
      }),
    },
  );

  if (!spotifyResponse.ok) {
    let spotifyError = null;

    try {
      spotifyError = await spotifyResponse.json();
    } catch {
      // Spotify returnerer ikke alltid JSON.
    }

    return NextResponse.json(
      {
        success: false,
        message:
          spotifyError?.error?.message ??
          "Kunne ikke starte Spotify-avspilling.",
        spotifyStatus: spotifyResponse.status,
      },
      { status: spotifyResponse.status },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Spotify-avspilling startet.",
  });
}
