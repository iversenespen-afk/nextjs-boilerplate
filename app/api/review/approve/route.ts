import { supabaseAdmin } from "@/lib/supabase-admin";

type ApproveRequestBody = {
  id?: number | string;
  concept_id?: string;
  matched_text?: string;
};

function cleanConceptId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ApproveRequestBody;

    const queueId = Number(body.id);
    const matchedText = String(body.matched_text ?? "").trim();
    const conceptId = cleanConceptId(
      String(body.concept_id ?? matchedText),
    );

    if (!Number.isInteger(queueId) || queueId <= 0) {
      return Response.json(
        {
          success: false,
          message: "Ugyldig kø-ID.",
        },
        { status: 400 },
      );
    }

    if (!conceptId || !matchedText) {
      return Response.json(
        {
          success: false,
          message: "Concept-ID og ordet i teksten må fylles ut.",
        },
        { status: 400 },
      );
    }

    /*
     * Hent den faktiske kø-raden fra databasen.
     * Vi stoler ikke på spotify_id eller theme_id fra nettleseren.
     */
    const { data: queueItem, error: queueError } =
      await supabaseAdmin
        .from("match_review_queue")
        .select(`
          id,
          spotify_id,
          theme_id,
          review_status
        `)
        .eq("id", queueId)
        .maybeSingle();

    if (queueError) {
      return Response.json(
        {
          success: false,
          message: `Kunne ikke lese køen: ${queueError.message}`,
        },
        { status: 500 },
      );
    }

    if (!queueItem) {
      return Response.json(
        {
          success: false,
          message: "Fant ikke køelementet.",
        },
        { status: 404 },
      );
    }

    if (queueItem.review_status !== "to_review") {
      return Response.json(
        {
          success: false,
          message: "Denne raden er allerede behandlet.",
        },
        { status: 409 },
      );
    }

    /*
     * Finn sangen som tidligere ble importert til songs.
     */
    const { data: song, error: songError } = await supabaseAdmin
      .from("songs")
      .select("id")
      .eq("spotify_id", queueItem.spotify_id)
      .maybeSingle();

    if (songError) {
      return Response.json(
        {
          success: false,
          message: `Kunne ikke finne sangen: ${songError.message}`,
        },
        { status: 500 },
      );
    }

    if (!song) {
      return Response.json(
        {
          success: false,
          message: "Sangen finnes ikke i songs-tabellen.",
        },
        { status: 404 },
      );
    }

    /*
     * Opprett concept hvis det ikke finnes.
     * Et eksisterende concept overskrives ikke.
     */
    const { data: existingConcept, error: conceptLookupError } =
      await supabaseAdmin
        .from("concepts")
        .select("id")
        .eq("id", conceptId)
        .maybeSingle();

    if (conceptLookupError) {
      return Response.json(
        {
          success: false,
          message:
            `Kunne ikke kontrollere concept: ${conceptLookupError.message}`,
        },
        { status: 500 },
      );
    }

    if (!existingConcept) {
      const { error: conceptInsertError } = await supabaseAdmin
        .from("concepts")
        .insert({
          id: conceptId,
          label_no: matchedText,
        });

      if (conceptInsertError) {
        return Response.json(
          {
            success: false,
            message:
              `Kunne ikke opprette concept: ${conceptInsertError.message}`,
          },
          { status: 500 },
        );
      }
    }

    /*
     * Se om koblingen allerede finnes.
     */
    const { data: existingMatch, error: matchLookupError } =
      await supabaseAdmin
        .from("song_matches")
        .select("id")
        .eq("song_id", song.id)
        .eq("theme_id", queueItem.theme_id)
        .eq("concept_id", conceptId)
        .maybeSingle();

    if (matchLookupError) {
      return Response.json(
        {
          success: false,
          message:
            `Kunne ikke kontrollere sangtreff: ${matchLookupError.message}`,
        },
        { status: 500 },
      );
    }

    if (existingMatch) {
      const { error: matchUpdateError } = await supabaseAdmin
        .from("song_matches")
        .update({
          matched_text: matchedText,
          verified: true,
        })
        .eq("id", existingMatch.id);

      if (matchUpdateError) {
        return Response.json(
          {
            success: false,
            message:
              `Kunne ikke oppdatere sangtreffet: ${matchUpdateError.message}`,
          },
          { status: 500 },
        );
      }
    } else {
      const { error: matchInsertError } = await supabaseAdmin
        .from("song_matches")
        .insert({
          song_id: song.id,
          theme_id: queueItem.theme_id,
          concept_id: conceptId,
          matched_text: matchedText,
          verified: true,
        });

      if (matchInsertError) {
        return Response.json(
          {
            success: false,
            message:
              `Kunne ikke opprette sangtreffet: ${matchInsertError.message}`,
          },
          { status: 500 },
        );
      }
    }

    /*
     * Marker køelementet som godkjent.
     */
    const { error: queueUpdateError } = await supabaseAdmin
      .from("match_review_queue")
      .update({
        concept_id: conceptId,
        matched_text: matchedText,
        verified: true,
        review_status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", queueId)
      .eq("review_status", "to_review");

    if (queueUpdateError) {
      return Response.json(
        {
          success: false,
          message:
            `Sangtreffet ble lagret, men køen kunne ikke oppdateres: ${queueUpdateError.message}`,
        },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      message: "Treffet ble godkjent og lagret.",
      queue_id: queueId,
      song_id: song.id,
      concept_id: conceptId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ukjent serverfeil.";

    return Response.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
