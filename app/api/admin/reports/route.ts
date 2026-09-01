import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  const { data: reports, error } = await supabaseAdmin
    .from("quiz_reports")
    .select(`
      id,
      created_at,
      report_type,
      comment,
      status,
      admin_note,
      resolved_at,
      participant_id,
      song_match_id,
      quiz_participants (
        display_name
      ),
      song_matches (
        theme_id,
        concept_id,
        songs (
          artist,
          title
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }

  const formattedReports = (reports ?? []).map((report: any) => ({
    id: report.id,
    created_at: report.created_at,
    report_type: report.report_type,
    comment: report.comment,
    status: report.status,
    admin_note: report.admin_note,
    resolved_at: report.resolved_at,
    participant_id: report.participant_id,
    song_match_id: report.song_match_id,
    display_name:
      report.quiz_participants?.display_name ?? null,
    theme_id:
      report.song_matches?.theme_id ?? "",
    concept_id:
      report.song_matches?.concept_id ?? "",
    artist:
      report.song_matches?.songs?.artist ?? "",
    title:
      report.song_matches?.songs?.title ?? "",
  }));

  return NextResponse.json({
    success: true,
    reports: formattedReports,
  });
}
