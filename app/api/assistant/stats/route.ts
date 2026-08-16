import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [
      queueResult,
      pendingSuggestionsResult,
      approvedResult,
      rejectedResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("match_review_queue")
        .select("id", { count: "exact", head: true })
        .eq("review_status", "to_review"),

      supabaseAdmin
        .from("assistant_suggestions")
        .select("queue_id", { count: "exact", head: true })
        .eq("status", "pending"),

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
      queueResult.error,
      pendingSuggestionsResult.error,
      approvedResult.error,
      rejectedResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      throw new Error(errors[0]?.message ?? "Kunne ikke hente statistikk.");
    }

    return NextResponse.json({
      success: true,
      stats: {
        queue: queueResult.count ?? 0,
        pendingSuggestions: pendingSuggestionsResult.count ?? 0,
        approved: approvedResult.count ?? 0,
        rejected: rejectedResult.count ?? 0,
      },
    });
  } catch (error) {
    console.error("Assistant stats error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Kunne ikke hente statistikk.",
      },
      { status: 500 },
    );
  }
}
