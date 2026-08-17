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
