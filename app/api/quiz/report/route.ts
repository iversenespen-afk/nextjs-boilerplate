import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type ReportRequest = {
  sessionId?: number;
  participantId?: number;
  songMatchId?: number;
  reportType?: string;
  comment?: string;
};

export async function POST(request: Request) {
  let body: ReportRequest;

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

  const sessionId = body.sessionId;
  const participantId = body.participantId;
  const songMatchId = body.songMatchId;
  const reportType = body.reportType?.trim();
  const comment = body.comment?.trim() || null;

  if (
    !Number.isInteger(sessionId) ||
    !sessionId ||
    sessionId <= 0 ||
    !Number.isInteger(participantId) ||
    !participantId ||
    participantId <= 0 ||
    !Number.isInteger(songMatchId) ||
    !songMatchId ||
    songMatchId <= 0 ||
    !reportType
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Gyldig sessionId, participantId, songMatchId og reportType må være med.",
      },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("quiz_reports")
    .insert({
      session_id: sessionId,
      participant_id: participantId,
      song_match_id: songMatchId,
      report_type: reportType,
      comment,
    });

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
  });
}
