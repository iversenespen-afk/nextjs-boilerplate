import { getLyrics } from "@/lib/lyrics-provider";
import { NextResponse } from "next/server";

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

Regler:
- Foreslå bare treff som faktisk finnes i sangteksten.
- matched_text skal være nøyaktig slik teksten står i sangen.
- Bruk eksisterende concept_id når riktig concept allerede finnes.
- Foreslå ny concept_id bare når det ikke finnes et passende concept.
- concept_id skal være små bokstaver med underscore.
- skill mellom teksten som synges og fullt visningsnavn.
- Ikke gjett ut fra artistnavn eller sangtittel alene.
- Returner maksimalt 10 forslag.
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

  return NextResponse.json({
    success: true,
    suggestions: parsed.suggestions ?? [],
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
