
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type QueueItem = {
  id: number;
  spotify_id: string;
  artist: string;
  title: string;
  theme_id: string;
  theme_name: string;
  source_playlist: string | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

const themeId =
  typeof body.themeId === "string" && body.themeId.trim()
    ? body.themeId.trim()
    : null;
    let query = supabaseAdmin
  .from("match_review_queue")
  .select(
    "id, spotify_id, artist, title, theme_id, theme_name, source_playlist",
  )
  .eq("review_status", "to_review")
  .order("id", { ascending: true });

if (themeId) {
  query = query.eq("theme_id", themeId);
}

const { data: items, error: itemsError } =
  await query.limit(25);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    const candidates = (items ?? []) as QueueItem[];

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
        message: "Ingen sanger venter på analyse.",
      });
    }

    // Finn hvilke kø-rader som allerede har pending forslag.
    const queueIds = candidates.map((item) => item.id);

    const { data: existingSuggestions, error: suggestionsError } =
      await supabaseAdmin
        .from("assistant_suggestions")
        .select("queue_id")
        .in("queue_id", queueIds)
        .eq("status", "pending");

    if (suggestionsError) {
      throw new Error(suggestionsError.message);
    }

    const queueIdsWithPending = new Set(
      (existingSuggestions ?? []).map(
        (suggestion: { queue_id: number }) =>
          suggestion.queue_id,
      ),
    );

    // Ikke bruk AI på nytt på sanger som allerede har
    // pending forslag klare til review.
    const itemsToAnalyze = candidates
      .filter(
        (item) => !queueIdsWithPending.has(item.id),
      )
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      items: itemsToAnalyze,
      count: itemsToAnalyze.length,
    });
  } catch (error) {
    console.error("Assistant batch selector error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Kunne ikke hente batch.",
      },
      { status: 500 },
    );
  }
}
