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

  const refreshToken = getCookieValue(
    cookieHeader,
    "spotify_refresh_token",
  );

  if (!refreshToken) {
    return NextResponse.json(
      {
        success: false,
        message: "Spotify refresh token mangler.",
      },
      { status: 401 },
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        success: false,
        message: "Spotify-konfigurasjon mangler.",
      },
      { status: 500 },
    );
  }

  const basicAuth = Buffer.from(
    `${clientId}:${clientSecret}`,
  ).toString("base64");

  const tokenResponse = await fetch(
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

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    return NextResponse.json(
      {
        success: false,
        message:
          tokenData?.error_description ??
          tokenData?.error ??
          "Kunne ikke fornye Spotify-token.",
      },
      { status: tokenResponse.status },
    );
  }

  const response = NextResponse.json({
    success: true,
    message: "Spotify-token fornyet.",
  });

  response.cookies.set(
    "spotify_access_token",
    tokenData.access_token,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: tokenData.expires_in ?? 3600,
    },
  );

  // Spotify kan returnere et nytt refresh token.
  if (tokenData.refresh_token) {
    response.cookies.set(
      "spotify_refresh_token",
      tokenData.refresh_token,
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
      },
    );
  }

  return response;
}
