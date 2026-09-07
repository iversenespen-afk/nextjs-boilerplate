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

  let accessToken = getCookieValue(
    cookieHeader,
    "spotify_access_token",
  );

  let accessTokenWasRefreshed = false;

  const refreshToken = getCookieValue(
  cookieHeader,
  "spotify_refresh_token",
);

  if (!accessToken && !refreshToken) {
  return NextResponse.json(
    {
      success: false,
      connected: false,
      message: "Spotify er ikke koblet til.",
    },
    { status: 401 },
  );
}

if (!accessToken && refreshToken) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        message: "Spotify-konfigurasjon mangler.",
      },
      { status: 500 },
    );
  }

  const basicAuth = Buffer.from(
    `${clientId}:${clientSecret}`,
  ).toString("base64");

  const refreshResponse = await fetch(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    },
  );

  const refreshData = await refreshResponse.json();

  if (!refreshResponse.ok) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        message: "Spotify-tilkoblingen må fornyes.",
      },
      { status: 401 },
    );
  }

  accessToken = refreshData.access_token;
  accessTokenWasRefreshed = true;
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

  const response = NextResponse.json({
  success: true,
  connected: true,
  profile: {
    id: profile.id,
    displayName: profile.display_name,
    product: profile.product,
    country: profile.country,
  },
});

if (accessTokenWasRefreshed && accessToken) {
  response.cookies.set(
    "spotify_access_token",
    accessToken,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    },
  );
}

return response;
}
