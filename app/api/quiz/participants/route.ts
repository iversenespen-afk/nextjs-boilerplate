import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      {
        success: false,
        message: "sessionId mangler.",
      },
      { status: 400 },
    );
  }

  const numericSessionId = Number(sessionId);

  if (!Number.isInteger(numericSessionId) || numericSessionId <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Ugyldig sessionId.",
      },
      { status: 400 },
    );
  }

  const { data: session, error: sessionError } =
    await supabaseAdmin
      .from("quiz_sessions")
      .select("id")
      .eq("id", numericSessionId)
      .maybeSingle();

  if (sessionError) {
    return NextResponse.json(
      {
        success: false,
        message: sessionError.message,
      },
      { status: 500 },
    );
  }

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: "Fant ikke quizrommet.",
      },
      { status: 404 },
    );
  }

  const { data: participants, error: participantsError } =
    await supabaseAdmin
      .from("quiz_participants")
      .select(
        "id, session_id, display_name, score, joined_at",
      )
      .eq("session_id", numericSessionId)
      .order("joined_at", { ascending: true });

  if (participantsError) {
    return NextResponse.json(
      {
        success: false,
        message: participantsError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    participants: participants ?? [],
  });
}
