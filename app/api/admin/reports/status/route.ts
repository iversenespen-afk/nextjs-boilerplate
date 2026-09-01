import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type StatusRequest = {
  reportId?: number;
  status?: "approved" | "rejected";
};

export async function POST(request: Request) {
  let body: StatusRequest;

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

  const reportId = body.reportId;
  const status = body.status;

  if (
    !Number.isInteger(reportId) ||
    !reportId ||
    !["approved", "rejected"].includes(status ?? "")
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Gyldig reportId og status må være med.",
      },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("quiz_reports")
    .update({
      status,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId);

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
