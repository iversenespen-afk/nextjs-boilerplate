import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RejectRequest = {
  queueId?: number;
  conceptId?: string;
};

export async function POST(request: Request) {
  let body: RejectRequest;

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

  const { queueId, conceptId } = body;

  if (!queueId || !conceptId) {
    return NextResponse.json(
      {
        success: false,
        message: "queueId og conceptId må være med.",
      },
      { status: 400 },
    );
  }
const {
  data: rejectedSuggestion,
  error: suggestionError,
} = await supabaseAdmin
  .from("assistant_suggestions")
  .update({
    status: "rejected",
    reviewed_at: new Date().toISOString(),
  })
  .eq("queue_id", queueId)
  .eq("concept_id", conceptId.trim())
  .eq("status", "pending")
  .select("id")
  .maybeSingle();

if (suggestionError) {
  return NextResponse.json(
    {
      success: false,
      message: suggestionError.message,
    },
    { status: 500 },
  );
}

if (!rejectedSuggestion) {
  return NextResponse.json(
    {
      success: false,
      message:
        "Fant ikke et pending forslag med denne queueId og conceptId.",
    },
    { status: 409 },
  );
}
  
  const { count: pendingCount, error: pendingError } =
  await supabaseAdmin
    .from("assistant_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("queue_id", queueId)
    .eq("status", "pending");

if (pendingError) {
  return NextResponse.json(
    {
      success: false,
      message: pendingError.message,
    },
    { status: 500 },
  );
}

if ((pendingCount ?? 0) === 0) {
  const { count: approvedCount, error: approvedCountError } =
    await supabaseAdmin
      .from("assistant_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("queue_id", queueId)
      .eq("status", "approved");

  if (approvedCountError) {
    return NextResponse.json(
      {
        success: false,
        message: approvedCountError.message,
      },
      { status: 500 },
    );
  }

  const finalStatus =
    (approvedCount ?? 0) > 0 ? "approved" : "rejected";

  let representativeApprovedSuggestion:
  | { concept_id: string; matched_text: string }
  | null = null;

if (finalStatus === "approved") {
  const {
    data: approvedSuggestion,
    error: approvedSuggestionError,
  } = await supabaseAdmin
    .from("assistant_suggestions")
    .select("concept_id, matched_text")
    .eq("queue_id", queueId)
    .eq("status", "approved")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (approvedSuggestionError) {
    return NextResponse.json(
      {
        success: false,
        message: approvedSuggestionError.message,
      },
      { status: 500 },
    );
  }

  if (!approvedSuggestion) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Review-raden er godkjent, men fant ingen godkjente forslag.",
      },
      { status: 409 },
    );
  }

  representativeApprovedSuggestion = approvedSuggestion;
}

  const { error: queueError } = await supabaseAdmin
    .from("match_review_queue")
    .update({
  concept_id:
    finalStatus === "approved"
      ? representativeApprovedSuggestion!.concept_id
      : null,
  matched_text:
    finalStatus === "approved"
      ? representativeApprovedSuggestion!.matched_text
      : null,
  verified: finalStatus === "approved",
  review_status: finalStatus,
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
}

  return NextResponse.json({
    success: true,
    message: "Forslaget er avvist.",
  });
}
