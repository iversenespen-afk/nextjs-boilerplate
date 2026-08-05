import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
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
