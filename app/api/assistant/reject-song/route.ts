import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RejectSongRequest = {
  queueId?: number;
};

export async function POST(request: Request) {
  let body: RejectSongRequest;

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

  const queueId = body.queueId;

  if (!queueId) {
    return NextResponse.json(
      {
        success: false,
        message: "queueId må være med.",
      },
      { status: 400 },
    );
  }

  const { data: queueItem, error: queueItemError } =
    await supabaseAdmin
      .from("match_review_queue")
      .select("id, review_status")
      .eq("id", queueId)
      .maybeSingle();

  if (queueItemError) {
    return NextResponse.json(
      {
        success: false,
        message: queueItemError.message,
      },
      { status: 500 },
    );
  }

  if (!queueItem) {
    return NextResponse.json(
      {
        success: false,
        message: "Fant ikke sangen i review-køen.",
      },
      { status: 404 },
    );
  }

  const { error: suggestionsError } = await supabaseAdmin
    .from("assistant_suggestions")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
    })
    .eq("queue_id", queueId)
    .eq("status", "pending");

  if (suggestionsError) {
    return NextResponse.json(
      {
        success: false,
        message: suggestionsError.message,
      },
      { status: 500 },
    );
  }

  const { error: queueError } = await supabaseAdmin
    .from("match_review_queue")
    .update({
      concept_id: null,
      matched_text: null,
      verified: false,
      review_status: "rejected",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", queueId);

  if (queueError) {
    return NextResponse.json(
      {
        success: false,
        message: queueError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Sangen er avvist.",
  });
}
