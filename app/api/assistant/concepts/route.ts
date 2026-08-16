import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const themeId = url.searchParams.get("themeId")?.trim();

  if (!themeId) {
    return NextResponse.json(
      {
        success: false,
        message: "themeId mangler.",
      },
      { status: 400 },
    );
  }

  const {
    data: groupRows,
    error: groupError,
  } = await supabaseAdmin
    .from("theme_concept_groups")
    .select("group_id")
    .eq("theme_id", themeId);

  if (groupError) {
    return NextResponse.json(
      {
        success: false,
        message: groupError.message,
      },
      { status: 500 },
    );
  }

  const groupIds = (groupRows ?? []).map(
    (row: { group_id: string }) => row.group_id,
  );

  if (groupIds.length === 0) {
    return NextResponse.json({
      success: true,
      themeId,
      groupIds: [],
      concepts: [],
    });
  }

  const {
    data: concepts,
    error: conceptsError,
  } = await supabaseAdmin
    .from("concepts")
    .select(
      "id, label_no, label_en, concept_class, group_id",
    )
    .in("group_id", groupIds)
    .order("label_no", { ascending: true })
    .limit(500);

  if (conceptsError) {
    return NextResponse.json(
      {
        success: false,
        message: conceptsError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    themeId,
    groupIds,
    concepts: concepts ?? [],
  });
}
