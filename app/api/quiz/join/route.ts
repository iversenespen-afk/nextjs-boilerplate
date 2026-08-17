import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type JoinRequest = {
  joinCode?: string;
  displayName?: string;
};

export async function POST(request: Request) {
  let body: JoinRequest;

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

  const joinCode = body.joinCode?.trim();
  const displayName = body.displayName?.trim();

  if (!joinCode || !displayName) {
    return NextResponse.json(
      {
        success: false,
        message: "Romkode og navn må være med.",
      },
      { status: 400 },
    );
  }

  const { data: session, error: sessionError } =
    await supabaseAdmin
      .from("quiz_sessions")
      .select("id, join_code, status")
      .eq("join_code", joinCode)
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
        message: "Fant ikke noe quizrom med denne koden.",
      },
      { status: 404 },
    );
  }

  if (session.status !== "lobby") {
    return NextResponse.json(
      {
        success: false,
        message: "Dette quizrommet tar ikke imot nye spillere.",
      },
      { status: 409 },
    );
  }

  const { data: participant, error: participantError } =
    await supabaseAdmin
      .from("quiz_participants")
      .insert({
        session_id: session.id,
        display_name: displayName,
      })
      .select(
        "id, session_id, display_name, score, joined_at",
      )
      .single();

  if (participantError) {
    if (participantError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "Dette navnet er allerede i bruk i rommet.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: participantError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    session: {
      id: session.id,
      joinCode: session.join_code,
      status: session.status,
    },
    participant,
  });
}
