import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RejectRequest = {
  queueId?: number;
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

  const { error } = await supabaseAdmin
    .from("match_review_queue")
    .update({
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
const { error: suggestionError } = await supabaseAdmin
  .from("assistant_suggestions")
  .update({
    status: "rejected",
    reviewed_at: new Date().toISOString(),
  })
  .eq("queue_id", queueId)
  .eq("concept_id", conceptId.trim())
  .eq("status", "pending");

if (suggestionError) {
  return NextResponse.json(
    {
      success: false,
      message: suggestionError.message,
    },
    { status: 500 },
  );
}

  return NextResponse.json({
    success: true,
    message: "Forslaget er avvist.",
  });
}
