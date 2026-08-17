import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function createJoinCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const joinCode = createJoinCode();

    const { data, error } = await supabaseAdmin
      .from("quiz_sessions")
      .insert({
        join_code: joinCode,
        status: "lobby",
      })
      .select("id, join_code, status, created_at")
      .single();

    if (!error) {
      return NextResponse.json({
        success: true,
        session: data,
      });
    }

    if (error.code !== "23505") {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Kunne ikke generere en unik romkode.",
    },
    { status: 500 },
  );
}
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

  const { data: session, error } = await supabaseAdmin
    .from("quiz_sessions")
    .select(
      "id, join_code, status, created_at, started_at, ended_at",
    )
    .eq("id", numericSessionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
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

  return NextResponse.json({
    success: true,
    session,
  });
}
