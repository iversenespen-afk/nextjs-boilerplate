import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const themeId = request.nextUrl.searchParams.get("themeId");

    if (!themeId) {
      return NextResponse.json(
        {
          success: false,
          message: "themeId mangler.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("theme_concept_groups")
      .select("group_id")
      .eq("theme_id", themeId);

    if (error) {
      throw error;
    }

    const groupIds = (data ?? []).map(
      (row) => row.group_id,
    );

    return NextResponse.json({
      success: true,
      groupIds,
    });
  } catch (error) {
    console.error("theme-groups GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Kunne ikke hente concept-grupper.",
      },
      { status: 500 },
    );
  }
}
