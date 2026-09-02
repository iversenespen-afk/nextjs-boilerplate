import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Finn eldste pending AI-forslag
  const { data: pendingSuggestion, error: pendingError } =
    await supabaseAdmin
      .from("assistant_suggestions")
      .select("queue_id")
      .eq("status", "pending")
      .order("queue_id", { ascending: true })
      .limit(1)
      .maybeSingle();

  if (pendingError) {
    console.error("Assistant pending error:", pendingError);

    return NextResponse.json(
      {
        success: false,
        message: pendingError.message,
      },
      { status: 500 },
    );
  }

  // 2. Hvis vi har pending forslag, hent den sangen først
  if (pendingSuggestion) {
    const { data: pendingItem, error: pendingItemError } =
      await supabaseAdmin
        .from("match_review_queue")
        .select(`
          id,
          spotify_id,
          artist,
          title,
          theme_id,
          theme_name,
          source_playlist,
          concept_id,
          matched_text,
          verified,
          review_status,
          notes,
          created_at
        `)
        .eq("id", pendingSuggestion.queue_id)
        .eq("review_status", "to_review")
        .maybeSingle();

    if (pendingItemError) {
      console.error(
        "Assistant pending item error:",
        pendingItemError,
      );

      return NextResponse.json(
        {
          success: false,
          message: pendingItemError.message,
        },
        { status: 500 },
      );
    }

    if (pendingItem) {
      return NextResponse.json({
        success: true,
        item: pendingItem,
      });
    }
  }

  // 3. Ingen pending forslag: hent vanlig neste sang
  const { data: item, error } = await supabaseAdmin
    .from("match_review_queue")
    .select(`
      id,
      spotify_id,
      artist,
      title,
      theme_id,
      theme_name,
      source_playlist,
      concept_id,
      matched_text,
      verified,
      review_status,
      notes,
      created_at
    `)
    .eq("review_status", "to_review")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Assistant next error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }

  if (!item) {
    return NextResponse.json({
      success: true,
      item: null,
      message: "Ingen sanger venter på behandling.",
    });
  }

  return NextResponse.json({
    success: true,
    item,
  });
}
