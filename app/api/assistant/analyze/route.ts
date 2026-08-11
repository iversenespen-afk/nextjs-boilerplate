import { THEME_CONCEPT_CLASSES } from "@/lib/theme-concept-classes";
import { getLyrics } from "@/lib/lyrics-provider";
import { NextResponse } from "next/server";
import { QUIZLYCS_ASSISTANT_RULES } from "@/lib/quizlycs-rules";

export const runtime = "nodejs";

type AnalyzeRequest = {
  spotifyId?: string;
  artist?: string;
  title?: string;
  themeId?: string;
  themeName?: string;
  lyrics?: string;
  concepts?: Array<{
    id: string;
    label_no: string;
    label_en?: string | null;
    concept_class?: string | null;
  }>;
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
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message: "OPENAI_API_KEY mangler i Vercel.",
      },
      { status: 500 },
    );
  }

  let body: AnalyzeRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Ugyldig JSON i forespørselen.",
      },
      { status: 400 },
    );
  }

  const artist = body.artist?.trim();
  const title = body.title?.trim();
  const themeId = body.themeId?.trim();
  const themeName = body.themeName?.trim();
  if (!artist || !title || !themeId || !themeName) {
  return NextResponse.json(
    {
      success: false,
      message:
        "artist, title, themeId og themeName må være med.",
      },
      { status: 400 },
    );
  }

  const lyricsResult = await getLyrics({
    spotifyId: body.spotifyId ?? "",
    artist,
    title,
  });

  const lyrics = lyricsResult.lyrics;

  const existingConcepts = (body.concepts ?? [])
    .slice(0, 500)
    .map((concept) => ({
      id: concept.id,
      label_no: concept.label_no,
      label_en: concept.label_en ?? null,
      concept_class: concept.concept_class ?? null,
    }));

  const prompt = `
Du er Quizlix Assistant.

Oppgaven er å finne ord eller uttrykk som FAKTISK forekommer i sangteksten og passer til det oppgitte temaet.

Sang:
Artist: ${artist}
Tittel: ${title}

Tema:
ID: ${themeId}
Navn: ${themeName}

Sangtekst:
${lyrics}

Eksisterende concepts:
${JSON.stringify(existingConcepts)}

${QUIZLYCS_ASSISTANT_RULES}

Returner maksimalt 10 forslag.
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
            name: "quizlix_suggestions",
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
                      concept_id: {
                        type: "string",
                      },
                      matched_text: {
                        type: "string",
                      },
                      display_name: {
                        type: "string",
                      },
                      confidence: {
                        type: "number",
                        minimum: 0,
                        maximum: 1,
                      },
                      existing_concept: {
                        type: "boolean",
                      },
                      concept_class: {
                        type: "string",
                      },
                      explanation: {
                        type: "string",
                      },
                    },
                    required: [
                      "concept_id",
                      "matched_text",
                      "display_name",
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
  console.error("OpenAI error:", result);

  return NextResponse.json(
    {
      success: false,
      message:
        result?.error?.message ??
        "OpenAI-kallet feilet.",
    },
    { status: openAiResponse.status },
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
  return NextResponse.json(
    {
      success: false,
      message: "OpenAI returnerte ikke noe strukturert svar.",
    },
    { status: 502 },
  );
}

try {
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

const allowedConceptClasses =
  THEME_CONCEPT_CLASSES[themeId] ?? [];

const validatedSuggestions = (
  parsed.suggestions ?? []
).filter(
  (suggestion: {
  concept_id?: string;
  matched_text?: string;
  confidence?: number;
  existing_concept?: boolean;
  concept_class?: string;  
}) => {
    const conceptId = suggestion.concept_id?.trim();
    const matchedText = suggestion.matched_text?.trim();
    const confidence = suggestion.confidence ?? 0;

    if (!conceptId || !matchedText) {
      return false;
    }

    const isExistingConcept =
  suggestion.existing_concept === true;

if (isExistingConcept) {
  if (!validConceptIds.has(conceptId)) {
    return false;
  }

  const concept = conceptsById.get(conceptId);

  if (!concept) {
    return false;
  }

  if (
    allowedConceptClasses.length > 0 &&
    !allowedConceptClasses.includes(
      concept.concept_class ?? "",
    )
  ) {
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

return NextResponse.json({
  success: true,
  suggestions: validatedSuggestions,
});
} catch {
  console.error(
    "Kunne ikke lese OpenAI-svaret:",
    outputText,
  );

  return NextResponse.json(
    {
      success: false,
      message: "Kunne ikke tolke svaret fra OpenAI.",
    },
    { status: 502 },
  );
}
}
