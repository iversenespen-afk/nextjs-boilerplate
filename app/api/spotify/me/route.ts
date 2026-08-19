import { NextResponse } from "next/server";

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
        connected: false,
        message: "Spotify er ikke koblet til.",
      },
      { status: 401 },
    );
  }

  const spotifyResponse = await fetch(
    "https://api.spotify.com/v1/me",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!spotifyResponse.ok) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        message: "Spotify-tokenet er ikke gyldig.",
      },
      { status: spotifyResponse.status },
    );
  }

  const profile = await spotifyResponse.json();

  return NextResponse.json({
    success: true,
    connected: true,
    profile: {
      id: profile.id,
      displayName: profile.display_name,
      product: profile.product,
      country: profile.country,
    },
  });
}
