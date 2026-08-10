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

  const { queueId } = body;

  if (!queueId) {
    return NextResponse.json(
      {
        success: false,
        message: "queueId må være med.",
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
    message: "Forslaget er avvist.",
  });
}
