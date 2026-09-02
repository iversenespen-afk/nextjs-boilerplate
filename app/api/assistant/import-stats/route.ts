import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [
      songsResult,
      queueResult,
      toReviewResult,
      approvedResult,
      rejectedResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("songs")
        .select("id", { count: "exact", head: true }),

      supabaseAdmin
        .from("match_review_queue")
        .select("id", { count: "exact", head: true }),

      supabaseAdmin
        .from("match_review_queue")
        .select("id", { count: "exact", head: true })
        .eq("review_status", "to_review"),

      supabaseAdmin
        .from("match_review_queue")
        .select("id", { count: "exact", head: true })
        .eq("review_status", "approved"),

      supabaseAdmin
        .from("match_review_queue")
        .select("id", { count: "exact", head: true })
        .eq("review_status", "rejected"),
    ]);

    const errors = [
      songsResult.error,
      queueResult.error,
      toReviewResult.error,
      approvedResult.error,
      rejectedResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      throw new Error(
        errors[0]?.message ?? "Kunne ikke hente import-status.",
      );
    }

    const themeRows: {
  theme_id: string;
  theme_name: string;
  review_status: string;
}[] = [];

const pageSize = 1000;
let from = 0;

while (true) {
  const { data, error } = await supabaseAdmin
    .from("match_review_queue")
    .select("theme_id, theme_name, review_status")
    .range(from, from + pageSize - 1);

  if (error) {
    throw new Error(error.message);
  }

  themeRows.push(...(data ?? []));

  if (!data || data.length < pageSize) {
    break;
  }

  from += pageSize;
}

    const themeStats = new Map<
      string,
      {
        themeId: string;
        themeName: string;
        total: number;
        toReview: number;
        approved: number;
        rejected: number;
      }
    >();

    for (const row of themeRows ?? []) {
      const current =
        themeStats.get(row.theme_id) ?? {
          themeId: row.theme_id,
          themeName: row.theme_name,
          total: 0,
          toReview: 0,
          approved: 0,
          rejected: 0,
        };

      current.total += 1;

      if (row.review_status === "to_review") {
        current.toReview += 1;
      } else if (row.review_status === "approved") {
        current.approved += 1;
      } else if (row.review_status === "rejected") {
        current.rejected += 1;
      }

      themeStats.set(row.theme_id, current);
    }

    return NextResponse.json({
      success: true,
      stats: {
        songs: songsResult.count ?? 0,
        queueTotal: queueResult.count ?? 0,
        toReview: toReviewResult.count ?? 0,
        approved: approvedResult.count ?? 0,
        rejected: rejectedResult.count ?? 0,
        themes: Array.from(themeStats.values()).sort((a, b) =>
          a.themeName.localeCompare(b.themeName),
        ),
      },
    });
  } catch (error) {
    console.error("Assistant import stats error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Kunne ikke hente import-status.",
      },
      { status: 500 },
    );
  }
}
