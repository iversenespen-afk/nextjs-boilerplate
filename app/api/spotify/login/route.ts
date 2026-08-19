import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  const redirectUri =
    "https://nextjs-boilerplate-three-rust-5x8kzk6ok5.vercel.app/api/spotify/callback";

  if (!clientId) {
    return NextResponse.json(
      {
        success: false,
        message: "SPOTIFY_CLIENT_ID mangler i Vercel.",
      },
      { status: 500 },
    );
  }

  const state = randomUUID();

  const scopes = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "streaming",
].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    state,
  });

  const response = NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`,
  );

  response.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
