import { getLyrics } from "@/lib/lyrics-provider";
import { QUIZLYCS_ASSISTANT_RULES } from "@/lib/quizlycs-rules";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type AssistantConcept = {
  id: string;
  label_no: string;
  label_en?: string | null;
  concept_class?: string | null;
};

export type AnalyzeQueueItemInput = {
  queueId: number;
  spotifyId: string;
  artist: string;
  title: string;
  themeId: string;
  themeName: string;
  concepts: AssistantConcept[];
};

export type AssistantSuggestion = {
  concept_id: string;
  matched_text: string;
  display_name: string;
  label_no: string;
  label_en: string;
  label_da: string;
  label_sv: string;
  label_de: string;
  label_es: string;
  confidence: number;
  existing_concept: boolean;
  concept_class: string;
  explanation: string;
};

function containsExactText(
  lyrics: string,
  matchedText: string,
): boolean {
  const escaped = matchedText.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`,
    "iu",
  );

  return pattern.test(lyrics);
}
export async function analyzeQueueItem(
  input: AnalyzeQueueItemInput,
): Promise<AssistantSuggestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY mangler i Vercel.");
  }

  const {
    queueId,
    spotifyId,
    artist,
    title,
    themeId,
    themeName,
    concepts,
  } = input;

  const lyricsResult = await getLyrics({
  spotifyId,
  artist,
  title,
  themeId,
  themeName,
});

  const lyrics = lyricsResult.lyrics;

  const existingConcepts = concepts
    .slice(0, 500)
    .map((concept) => ({
      id: concept.id,
      label_no: concept.label_no,
      label_en: concept.label_en ?? null,
      concept_class: concept.concept_class ?? null,
    }));

  const prompt = `
const prompt = `
Quizlycs Assistant.

Sang: ${artist} – ${title}
Tema: ${themeName} (${themeId})

Lyrics-evidence:
${lyrics}

Eksisterende concepts:
${JSON.stringify(existingConcepts)}

${QUIZLYCS_ASSISTANT_RULES}

Finn kun tydelige treff for temaet.

Viktig:
- matched_text må faktisk finnes ordrett i evidence.
- Ikke gjett identitet fra hint, initialer, stavelek, kallenavn eller kontekst.
- Ikke foreslå et concept hvis forklaringen krever "sannsynligvis", "trolig" eller lignende slutning.
- Bruk eksisterende concept når evidence entydig viser samme concept.
- Maks 10 forslag.
`;

  const openAiResponse = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "quizlycs_suggestions",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                suggestions: {
                  type: "array",
                  maxItems: 10,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      concept_id: { type: "string" },
                      matched_text: { type: "string" },
                      display_name: { type: "string" },
                      label_no: { type: "string" },
                      label_en: { type: "string" },
                      label_da: { type: "string" },
                      label_sv: { type: "string" },
                      label_de: { type: "string" },
                      label_es: { type: "string" },
                      confidence: {
                        type: "number",
                        minimum: 0,
                        maximum: 1,
                      },
                      existing_concept: { type: "boolean" },
                      concept_class: { type: "string" },
                      explanation: { type: "string" },
                    },
                    required: [
                      "concept_id",
                      "matched_text",
                      "display_name",
                      "label_no",
                      "label_en",
                      "label_da",
                      "label_sv",
                      "label_de",
                      "label_es",
                      "confidence",
                      "existing_concept",
                      "concept_class",
                      "explanation",
                    ],
                  },
                },
              },
              required: ["suggestions"],
            },
          },
        },
      }),
    },
  );

  const result = await openAiResponse.json();

  if (!openAiResponse.ok) {
    throw new Error(
      result?.error?.message ?? "OpenAI-kallet feilet.",
    );
  }

  const message = result.output?.find(
    (item: { type?: string }) => item.type === "message",
  );

  const outputContent = message?.content?.find(
    (item: { type?: string }) => item.type === "output_text",
  );

  const outputText = outputContent?.text;

  if (!outputText) {
    throw new Error(
      "OpenAI returnerte ikke noe strukturert svar.",
    );
  }

  const parsed = JSON.parse(outputText);

  const validConceptIds = new Set(
    existingConcepts.map((concept) => concept.id),
  );

  const conceptsById = new Map(
    existingConcepts.map((concept) => [
      concept.id,
      concept,
    ]),
  );

  const validatedSuggestions = (
    parsed.suggestions ?? []
  ).filter(
    (suggestion: AssistantSuggestion) => {
      const conceptId = suggestion.concept_id?.trim();
      const matchedText = suggestion.matched_text?.trim();
      const confidence = suggestion.confidence ?? 0;

      if (!conceptId || !matchedText) {
        return false;
      }

      if (suggestion.existing_concept) {
        if (!validConceptIds.has(conceptId)) {
          return false;
        }

        const concept = conceptsById.get(conceptId);

      if (!concept) {
          return false;
      }
      } else {
        if (validConceptIds.has(conceptId)) {
          return false;
        }
      }

      if (!containsExactText(lyrics, matchedText)) {
        return false;
      }

      if (confidence < 0.5) {
        return false;
      }

      return true;
    },
  );

  const { error: deleteSuggestionsError } = await supabaseAdmin
    .from("assistant_suggestions")
    .delete()
    .eq("queue_id", queueId)
    .eq("status", "pending");

  if (deleteSuggestionsError) {
    throw new Error(deleteSuggestionsError.message);
  }

  const {
    data: reviewedSuggestions,
    error: reviewedSuggestionsError,
  } = await supabaseAdmin
    .from("assistant_suggestions")
    .select("concept_id")
    .eq("queue_id", queueId)
    .in("status", ["approved", "rejected"]);

  if (reviewedSuggestionsError) {
    throw new Error(reviewedSuggestionsError.message);
  }

  const reviewedConceptIds = new Set(
    (reviewedSuggestions ?? []).map(
      (suggestion: { concept_id: string }) =>
        suggestion.concept_id,
    ),
  );

    const uniqueSuggestions = Array.from(
  new Map<string, AssistantSuggestion>(
    validatedSuggestions.map(
      (suggestion: AssistantSuggestion) => [
        suggestion.concept_id,
        suggestion,
      ],
    ),
  ).values(),
);

const reviewableSuggestions =
  uniqueSuggestions.filter(
    (suggestion: AssistantSuggestion) =>
      !reviewedConceptIds.has(suggestion.concept_id),
  );

  if (reviewableSuggestions.length > 0) {
    const suggestionRows = reviewableSuggestions.map(
      (suggestion: AssistantSuggestion) => ({
        queue_id: queueId,
        concept_id: suggestion.concept_id,
        matched_text: suggestion.matched_text,
        display_name: suggestion.display_name,
        label_no: suggestion.label_no,
        label_en: suggestion.label_en,
        label_da: suggestion.label_da,
        label_sv: suggestion.label_sv,
        label_de: suggestion.label_de,
        label_es: suggestion.label_es,
        confidence: suggestion.confidence,
        existing_concept: suggestion.existing_concept,
        concept_class: suggestion.concept_class ?? null,
        explanation: suggestion.explanation ?? null,
        status: "pending",
      }),
    );

    const { error: insertSuggestionsError } =
      await supabaseAdmin
        .from("assistant_suggestions")
        .insert(suggestionRows);

    if (insertSuggestionsError) {
      throw new Error(insertSuggestionsError.message);
    }
  }

  return reviewableSuggestions;
}
