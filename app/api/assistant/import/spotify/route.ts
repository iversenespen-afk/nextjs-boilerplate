import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ImportRequest = {
  playlistUrl?: string;
};

function getPlaylistId(value: string): string | null {
  const trimmed = value.trim();

  // Tillat også ren playlist-ID
  if (/^[A-Za-z0-9]+$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    if (url.hostname !== "open.spotify.com") {
      return null;
    }

    const parts = url.pathname.split("/").filter(Boolean);

    if (parts[0] !== "playlist" || !parts[1]) {
      return null;
    }

    return parts[1];
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: ImportRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Ugyldig JSON.",
      },
      { status: 400 },
    );
  }

  const playlistUrl = body.playlistUrl?.trim();

  if (!playlistUrl) {
    return NextResponse.json(
      {
        success: false,
        message: "Spotify-spilleliste mangler.",
      },
      { status: 400 },
    );
  }

  const playlistId = getPlaylistId(playlistUrl);

  if (!playlistId) {
    return NextResponse.json(
      {
        success: false,
        message: "Ugyldig Spotify-spilleliste.",
      },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";

  const accessToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) =>
      part.startsWith("spotify_access_token="),
    )
    ?.slice("spotify_access_token=".length);

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Spotify er ikke koblet til. Logg inn med Spotify først.",
      },
      { status: 401 },
    );
  }

  const spotifyResponse = await fetch(
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(
      playlistId,
    )}/items?limit=50`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const spotifyData = await spotifyResponse.json();

  if (!spotifyResponse.ok) {
    console.error("Spotify playlist error:", spotifyData);

    return NextResponse.json(
      {
        success: false,
        message:
          spotifyData?.error?.message ??
          "Kunne ikke hente Spotify-spillelisten.",
      },
      { status: spotifyResponse.status },
    );
  }

  const basicTracks = (spotifyData.items ?? [])
  .map(
    (item: {
      item?: {
        id?: string | null;
        name?: string;
        type?: string;
        artists?: Array<{ name?: string }>;
      };
    }) => item.item,
  )
  .filter(
    (
      track: {
        id?: string | null;
        name?: string;
        type?: string;
        artists?: Array<{ name?: string }>;
      } | undefined,
    ) =>
      track?.type === "track" &&
      Boolean(track.id) &&
      Boolean(track.name),
  );

const spotifyIds = basicTracks
  .map((track: { id?: string | null }) => track.id)
  .filter(
    (id: string | null | undefined): id is string =>
      Boolean(id),
  );

const tracksResponse = await fetch(
  `https://api.spotify.com/v1/tracks?ids=${encodeURIComponent(
    spotifyIds.join(","),
  )}`,
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  },
);

const tracksData = await tracksResponse.json();

if (!tracksResponse.ok) {
  return NextResponse.json(
    {
      success: false,
      message:
        tracksData?.error?.message ??
        "Kunne ikke hente full Spotify-metadata.",
    },
    { status: tracksResponse.status },
  );
}

const tracks = (tracksData.tracks ?? [])
  .filter(
    (track: {
      id?: string | null;
      name?: string;
      type?: string;
    } | null) =>
      track?.type === "track" &&
      Boolean(track.id) &&
      Boolean(track.name),
  )
  .map(
    (track: {
      id: string;
      name: string;
      artists?: Array<{
        id?: string;
        name?: string;
      }>;
      album?: {
        id?: string;
        name?: string;
        release_date?: string;
        album_type?: string;
        images?: Array<{
          url?: string;
        }>;
      };
      duration_ms?: number;
      explicit?: boolean;
      external_ids?: {
        isrc?: string;
      };
    }) => {
      const releaseDate =
        track.album?.release_date ?? null;

      const releaseYear =
        releaseDate && /^\d{4}/.test(releaseDate)
          ? Number(releaseDate.slice(0, 4))
          : null;

      const decade =
        releaseYear !== null
          ? Math.floor(releaseYear / 10) * 10
          : null;

      return {
        spotify_id: track.id,

        artist: (track.artists ?? [])
          .map((artist) => artist.name)
          .filter(Boolean)
          .join(", "),

        title: track.name,

        spotify_artist_id:
          track.artists?.[0]?.id ?? null,

        spotify_album_id:
          track.album?.id ?? null,

        album_name:
          track.album?.name ?? null,

        release_date: releaseDate,
        release_year: releaseYear,
        decade,

        duration_ms:
          track.duration_ms ?? null,

        explicit:
          track.explicit ?? null,

        isrc:
          track.external_ids?.isrc ?? null,

        album_type:
          track.album?.album_type ?? null,

        cover_url:
          track.album?.images?.[0]?.url ?? null,
      };
    },
  );

  return NextResponse.json({
    success: true,
    playlistId,
    count: tracks.length,
    tracks,
  });
}
