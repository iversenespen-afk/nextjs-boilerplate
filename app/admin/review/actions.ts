"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

function cleanConceptId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function approveReview(formData: FormData) {
  const queueId = Number(formData.get("queue_id"));
  const spotifyId = String(formData.get("spotify_id") ?? "");
  const themeId = String(formData.get("theme_id") ?? "");
  const enteredConceptId = String(formData.get("concept_id") ?? "");
  const matchedText = String(formData.get("matched_text") ?? "").trim();

  const conceptId = cleanConceptId(enteredConceptId || matchedText);

  if (
    !queueId ||
    !spotifyId ||
    !themeId ||
    !conceptId ||
    !matchedText
  ) {
    throw new Error("Concept-ID og ord i teksten må fylles ut.");
  }

  // Finn sangen som allerede ble importert fra Spotify-lista.
  const { data: song, error: songError } = await supabaseAdmin
    .from("songs")
    .select("id")
    .eq("spotify_id", spotifyId)
    .single();

  if (songError || !song) {
    throw new Error("Fant ikke sangen i songs-tabellen.");
  }

  // Opprett begrepet dersom det ikke finnes fra før.
  const { error: conceptError } = await supabaseAdmin
    .from("concepts")
    .upsert(
      {
        id: conceptId,
        label_no: matchedText,
        label_en: matchedText,
      },
      {
        onConflict: "id",
      },
    );

  if (conceptError) {
    throw new Error(`Kunne ikke lagre concept: ${conceptError.message}`);
  }

  // Opprett eller oppdater fasittkoblingen.
  const { error: matchError } = await supabaseAdmin
    .from("song_matches")
    .upsert(
      {
        song_id: song.id,
        theme_id: themeId,
        concept_id: conceptId,
        matched_text: matchedText,
        verified: true,
      },
      {
        onConflict: "song_id,theme_id,concept_id",
      },
    );

  if (matchError) {
    throw new Error(`Kunne ikke lagre sangtreff: ${matchError.message}`);
  }

  // Marker køelementet som ferdig.
  const { error: queueError } = await supabaseAdmin
    .from("match_review_queue")
    .update({
      concept_id: conceptId,
      matched_text: matchedText,
      verified: true,
      review_status: "approved",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", queueId);

  if (queueError) {
    throw new Error(`Kunne ikke oppdatere køen: ${queueError.message}`);
  }

  revalidatePath("/admin/review");
}

export async function rejectReview(formData: FormData) {
  const queueId = Number(formData.get("queue_id"));

  if (!queueId) {
    throw new Error("Mangler kø-ID.");
  }

  const { error } = await supabaseAdmin
    .from("match_review_queue")
    .update({
      review_status: "rejected",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", queueId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/review");
}

export async function skipReview(formData: FormData) {
  const queueId = Number(formData.get("queue_id"));

  if (!queueId) {
    throw new Error("Mangler kø-ID.");
  }

  const { error } = await supabaseAdmin
    .from("match_review_queue")
    .update({
      review_status: "skipped",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", queueId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/review");
}
