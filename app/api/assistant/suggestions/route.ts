import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queueId = Number(searchParams.get("queueId"));

  if (!Number.isInteger(queueId) || queueId <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Gyldig queueId mangler.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("assistant_suggestions")
    .select(
      "concept_id, matched_text, display_name, confidence, existing_concept, concept_class, explanation",
    )
    .eq("queue_id", queueId)
    .eq("status", "pending")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    suggestions: data ?? [],
  });
}
