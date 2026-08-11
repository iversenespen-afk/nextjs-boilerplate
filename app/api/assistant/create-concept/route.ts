import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CreateConceptRequest = {
  conceptId?: string;
  displayName?: string;
  conceptClass?: string;
};

export async function POST(request: Request) {
  let body: CreateConceptRequest;

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

  const conceptId = body.conceptId?.trim();
  const displayName = body.displayName?.trim();
  const conceptClass = body.conceptClass?.trim();

  if (!conceptId || !displayName || !conceptClass) {
    return NextResponse.json(
      {
        success: false,
        message:
          "conceptId, displayName og conceptClass må være med.",
      },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } =
    await supabaseAdmin
      .from("concepts")
      .select("id")
      .eq("id", conceptId)
      .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      {
        success: false,
        message: existingError.message,
      },
      { status: 500 },
    );
  }

  if (existing) {
    return NextResponse.json(
      {
        success: false,
        message: `Concept "${conceptId}" finnes allerede.`,
      },
      { status: 409 },
    );
  }

  const { error: insertError } = await supabaseAdmin
    .from("concepts")
    .insert({
      id: conceptId,
      label_no: displayName,
      label_en: displayName,
      is_proper_noun: true,
      concept_class: conceptClass,
    });

  if (insertError) {
    return NextResponse.json(
      {
        success: false,
        message: insertError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: `Concept "${displayName}" er opprettet.`,
  });
}
