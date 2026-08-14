import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REDIRECT_URI =
  "https://nextjs-boilerplate-three-rust-5x8kzk6ok5.vercel.app/api/spotify/callback";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const cookieHeader = request.headers.get("cookie") ?? "";

  const stateCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("spotify_oauth_state="))
    ?.split("=")[1];

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/admin/assistant/import?spotify_error=${encodeURIComponent(error)}`,
        request.url,
      ),
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      {
        success: false,
        message: "Spotify callback mangler code eller state.",
      },
      { status: 400 },
    );
  }

  if (!stateCookie || state !== stateCookie) {
    return NextResponse.json(
      {
        success: false,
        message: "Spotify OAuth state stemmer ikke.",
      },
      { status: 400 },
    );
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        success: false,
        message:
          "SPOTIFY_CLIENT_ID eller SPOTIFY_CLIENT_SECRET mangler i Vercel.",
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
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    },
  );

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    console.error("Spotify token error:", tokenData);

    return NextResponse.json(
      {
        success: false,
        message:
          tokenData?.error_description ??
          tokenData?.error ??
          "Kunne ikke hente Spotify-token.",
      },
      { status: tokenResponse.status },
    );
  }

  const response = NextResponse.redirect(
    new URL(
      "/admin/assistant/import?spotify_connected=1",
      request.url,
    ),
  );

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

  response.cookies.set("spotify_oauth_state", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
