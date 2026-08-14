import { THEME_CONCEPT_CLASSES } from "@/lib/theme-concept-classes";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  analyzeQueueItem,
  type AssistantConcept,
} from "@/lib/assistant/analyze-queue-item";

export const runtime = "nodejs";

type QueueItem = {
  id: number;
  spotify_id: string;
  artist: string;
  title: string;
  theme_id: string;
  theme_name: string;
};

export async function POST() {
  try {
    // 1. Hent de neste 5 radene som venter på review
    const { data: items, error: itemsError } =
      await supabaseAdmin
        .from("match_review_queue")
        .select(
          "id, spotify_id, artist, title, theme_id, theme_name",
        )
        .eq("review_status", "to_review")
        .order("id", { ascending: true })
        .limit(5);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    const queueItems = (items ?? []) as QueueItem[];

    if (queueItems.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        results: [],
        message: "Ingen sanger venter på analyse.",
      });
    }

    const results = [];

    // 2. Analyser sangene én etter én
    for (const item of queueItems) {
      try {
        // Hent concepts som hører til temaet
        const allowedConceptClasses =
          THEME_CONCEPT_CLASSES[item.theme_id] ?? [];
        
        if (allowedConceptClasses.length === 0) {
          throw new Error(
            `Ingen concept classes er definert for tema ${item.theme_id}.`,
          );
        }

const { data: concepts, error: conceptsError } =
  await supabaseAdmin
    .from("concepts")
    .select(
      "id, label_no, label_en, concept_class",
    )
    .in("concept_class", allowedConceptClasses)
    .limit(500);

        if (conceptsError) {
          throw new Error(conceptsError.message);
        }

        const suggestions = await analyzeQueueItem({
          queueId: item.id,
          spotifyId: item.spotify_id ?? "",
          artist: item.artist,
          title: item.title,
          themeId: item.theme_id,
          themeName: item.theme_name,
          concepts: (concepts ?? []) as AssistantConcept[],
        });

        results.push({
          queueId: item.id,
          artist: item.artist,
          title: item.title,
          success: true,
          suggestionCount: suggestions.length,
        });
      } catch (error) {
        console.error(
          `Batch analysis failed for queue ${item.id}:`,
          error,
        );

        results.push({
          queueId: item.id,
          artist: item.artist,
          title: item.title,
          success: false,
          suggestionCount: 0,
          message:
            error instanceof Error
              ? error.message
              : "Analyse feilet.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Assistant batch error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Batch-analyse feilet.",
      },
      { status: 500 },
    );
  }
}
