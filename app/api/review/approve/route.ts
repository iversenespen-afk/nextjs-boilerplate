import { supabaseAdmin } from "@/lib/supabase-admin";

type ReviewHit = {
  concept_id?: string;
  matched_text?: string;
};

type ApproveRequestBody = {
  id?: number | string;
  hits?: ReviewHit[];
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

    const hits = (body.hits ?? [])
      .map((hit) => {
        const matchedText = String(hit.matched_text ?? "").trim();
        const conceptId = cleanConceptId(
          String(hit.concept_id ?? matchedText),
        );

        return {
          concept_id: conceptId,
          matched_text: matchedText,
        };
      })
      .filter(
        (hit) => hit.concept_id && hit.matched_text,
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

    if (hits.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Legg inn minst ett gyldig treff.",
        },
        { status: 400 },
      );
    }

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

    for (const hit of hits) {
      const { data: existingConcept, error: conceptLookupError } =
        await supabaseAdmin
          .from("concepts")
          .select("id")
          .eq("id", hit.concept_id)
          .maybeSingle();

      if (conceptLookupError) {
        return Response.json(
          {
            success: false,
            message:
              `Kunne ikke kontrollere ${hit.concept_id}: ` +
              conceptLookupError.message,
          },
          { status: 500 },
        );
      }

      if (!existingConcept) {
        const { error: conceptInsertError } = await supabaseAdmin
          .from("concepts")
          .insert({
            id: hit.concept_id,
            label_no: hit.matched_text,
          });

        if (conceptInsertError) {
          return Response.json(
            {
              success: false,
              message:
                `Kunne ikke opprette ${hit.concept_id}: ` +
                conceptInsertError.message,
            },
            { status: 500 },
          );
        }
      }

      const { data: existingMatch, error: matchLookupError } =
        await supabaseAdmin
          .from("song_matches")
          .select("id")
          .eq("song_id", song.id)
          .eq("theme_id", queueItem.theme_id)
          .eq("concept_id", hit.concept_id)
          .maybeSingle();

      if (matchLookupError) {
        return Response.json(
          {
            success: false,
            message:
              `Kunne ikke kontrollere treffet ${hit.concept_id}: ` +
              matchLookupError.message,
          },
          { status: 500 },
        );
      }

      if (existingMatch) {
        const { error: matchUpdateError } = await supabaseAdmin
          .from("song_matches")
          .update({
            matched_text: hit.matched_text,
            verified: true,
          })
          .eq("id", existingMatch.id);

        if (matchUpdateError) {
          return Response.json(
            {
              success: false,
              message:
                `Kunne ikke oppdatere ${hit.concept_id}: ` +
                matchUpdateError.message,
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
            concept_id: hit.concept_id,
            matched_text: hit.matched_text,
            verified: true,
          });

        if (matchInsertError) {
          return Response.json(
            {
              success: false,
              message:
                `Kunne ikke lagre ${hit.concept_id}: ` +
                matchInsertError.message,
            },
            { status: 500 },
          );
        }
      }
    }

    const { error: queueUpdateError } = await supabaseAdmin
      .from("match_review_queue")
      .update({
        concept_id: hits[0].concept_id,
        matched_text: hits[0].matched_text,
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
            `Treffene ble lagret, men køen kunne ikke oppdateres: ` +
            queueUpdateError.message,
        },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      message: `${hits.length} treff ble godkjent og lagret.`,
      queue_id: queueId,
      song_id: song.id,
      saved_hits: hits.length,
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
