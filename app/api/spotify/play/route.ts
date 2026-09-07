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

  const devicesResponse = await fetch(
  "https://api.spotify.com/v1/me/player/devices",
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  },
);

let selectedDeviceId: string | null = null;

if (devicesResponse.ok) {
  const devicesResult = await devicesResponse.json();

  const devices = devicesResult.devices ?? [];

  const selectedDevice =
    devices.find(
      (device: { is_active: boolean; is_restricted: boolean }) =>
        device.is_active && !device.is_restricted,
    ) ??
    devices.find(
      (device: { is_restricted: boolean }) =>
        !device.is_restricted,
    );

  selectedDeviceId = selectedDevice?.id ?? null;
}

const playUrl = selectedDeviceId
  ? `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(selectedDeviceId)}`
  : "https://api.spotify.com/v1/me/player/play";

const spotifyResponse = await fetch(playUrl, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    uris: [spotifyUri],
    position_ms: 0,
  }),
});

  if (!spotifyResponse.ok) {
  let spotifyError = null;

  try {
    spotifyError = await spotifyResponse.json();
  } catch {
    // Spotify returnerer ikke alltid JSON.
  }

  const spotifyMessage =
    spotifyError?.error?.message ?? "";

  const noActiveDevice =
    spotifyResponse.status === 404 ||
    spotifyMessage.toLowerCase().includes("not found") ||
    spotifyMessage.toLowerCase().includes("device");

  return NextResponse.json(
    {
      success: false,
      message: noActiveDevice
        ? "Ingen aktiv Spotify-enhet funnet. Åpne Spotify, start eller aktiver avspilling der, og prøv igjen."
        : spotifyMessage ||
          "Kunne ikke starte Spotify-avspilling.",
      spotifyStatus: spotifyResponse.status,
      errorCode: noActiveDevice
        ? "NO_ACTIVE_DEVICE"
        : "SPOTIFY_PLAYBACK_ERROR",
    },
    { status: spotifyResponse.status },
  );
}

  return NextResponse.json({
    success: true,
    message: "Spotify-avspilling startet.",
  });
}
