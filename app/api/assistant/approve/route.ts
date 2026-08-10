import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type ApproveRequest = {
  queueId?: number;
  spotifyId?: string;
  themeId?: string;
  conceptId?: string;
  matchedText?: string;
};

export async function POST(request: Request) {
  let body: ApproveRequest;

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

  const {
    queueId,
    spotifyId,
    themeId,
    conceptId,
    matchedText,
  } = body;

  if (
    !queueId ||
    !spotifyId?.trim() ||
    !themeId?.trim() ||
    !conceptId?.trim() ||
    !matchedText?.trim()
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "queueId, spotifyId, themeId, conceptId og matchedText må være med.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Godkjenn-routen fungerer.",
  });
}
