import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeArtistType(
  musicBrainzType: string | null,
): string | null {
  if (!musicBrainzType) return null;

  switch (musicBrainzType.toLowerCase()) {
    case "person":
      return "solo";

    case "orchestra":
      return "orchestra";

    case "choir":
      return "choir";

    case "group":
      // MusicBrainz "Group" kan være band, duo osv.
      // Vi setter derfor foreløpig "group".
      return "group";

    default:
      return "other";
  }
}

export async function POST() {
  const { data: artists, error: artistsError } =
    await supabaseAdmin
      .from("artists")
      .select(
        "id, name, spotify_artist_id, country_type_synced",
      )
      .eq("country_type_synced", false)
      .order("id", { ascending: true })
      .limit(5);

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
      message: "Alle artister er allerede forsøkt beriket.",
      results: [],
    });
  }

  const results: {
    artistId: number;
    name: string;
    success: boolean;
    matchedName?: string;
    score?: number;
    country?: string | null;
    externalType?: string | null;
    artistType?: string | null;
    musicbrainzId?: string | null;
    message?: string;
  }[] = [];

  for (const artist of artists) {
    try {
      const query = encodeURIComponent(
        `artist:"${artist.name.replace(/"/g, '\\"')}"`,
      );

      const response = await fetch(
        `https://musicbrainz.org/ws/2/artist/?query=${query}&limit=5&fmt=json`,
        {
          headers: {
            "User-Agent":
              "Quizlycs/0.1 (https://nextjs-boilerplate-three-rust-5x8kzk6ok5.vercel.app)",
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        results.push({
          artistId: artist.id,
          name: artist.name,
          success: false,
          message: `MusicBrainz svarte ${response.status}.`,
        });

        await sleep(1100);
        continue;
      }

      const data = await response.json();

      const candidates = data.artists ?? [];

      if (candidates.length === 0) {
        await supabaseAdmin
          .from("artists")
          .update({
            country_type_synced: true,
          })
          .eq("id", artist.id);

        results.push({
          artistId: artist.id,
          name: artist.name,
          success: false,
          message: "Ingen treff i MusicBrainz.",
        });

        await sleep(1100);
        continue;
      }

      const bestMatch = candidates[0];

      const score =
        typeof bestMatch.score === "number"
          ? bestMatch.score
          : 0;

      const country =
        bestMatch.country ?? null;

      const externalType =
        bestMatch.type ?? null;

      const normalizedType =
        normalizeArtistType(externalType);

      const musicbrainzId =
        bestMatch.id ?? null;

      const { error: updateError } =
        await supabaseAdmin
          .from("artists")
          .update({
            musicbrainz_id: musicbrainzId,
            country_of_origin: country,
            external_artist_type: externalType,
            artist_type: normalizedType,
            metadata_source: "musicbrainz",
            country_type_synced: true,

            // Ikke marker som verified automatisk ennå.
            verified: false,
          })
          .eq("id", artist.id);

      if (updateError) {
        results.push({
          artistId: artist.id,
          name: artist.name,
          success: false,
          message: updateError.message,
        });

        await sleep(1100);
        continue;
      }

      results.push({
        artistId: artist.id,
        name: artist.name,
        success: true,
        matchedName: bestMatch.name,
        score,
        country,
        externalType,
        artistType: normalizedType,
        musicbrainzId,
      });
    } catch {
      results.push({
        artistId: artist.id,
        name: artist.name,
        success: false,
        message: "Uventet feil under MusicBrainz-oppslag.",
      });
    }

    await sleep(1100);
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
