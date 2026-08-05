import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const classByTheme: Record<string, string[]> = {
  artists: ["person", "band"],
  artister: ["person", "band"],
  body_parts: ["body_part"],
  kroppsdeler: ["body_part"],
  colors: ["color"],
  farger: ["color"],
  trees: ["tree"],
  treslag: ["tree"],
  instruments: ["instrument"],
  instrumenter: ["instrument"],
  planets: ["planet", "fictional_planet"],
  planeter: ["planet", "fictional_planet"],
};

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

  const conceptClasses = classByTheme[themeId] ?? [];

  let query = supabaseAdmin
    .from("concepts")
    .select(`
      id,
      label_no,
      label_en,
      concept_class,
      is_proper_noun
    `)
    .order("label_no");

  if (conceptClasses.length) {
    query = query.in("concept_class", conceptClasses);
  }

  const { data, error } = await query.limit(500);

  if (error) {
    console.error("Assistant concepts error:", error);

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
    concepts: data ?? [],
  });
}
